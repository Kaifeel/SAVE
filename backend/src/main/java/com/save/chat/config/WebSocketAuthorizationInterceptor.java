package com.save.chat.config;

import com.save.chat.service.ChatRoomService;
import com.save.user.UserRepository;
import com.save.user.UserStatus;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.http.HttpHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.stereotype.Component;

@Component
public class WebSocketAuthorizationInterceptor implements ChannelInterceptor {
    private static final Pattern ROOM_SEND_DESTINATION = Pattern.compile(
            "^/app/chats/rooms/(\\d+)/messages$");
    private static final Pattern ROOM_SUBSCRIBE_DESTINATION = Pattern.compile(
            "^/topic/chats/rooms/(\\d+)$");
    private static final String CHAT_LIST_DESTINATION = "/user/queue/chat-list";
    private static final String NOTIFICATION_DESTINATION = "/user/queue/notifications";

    private final JwtDecoder jwtDecoder;
    private final UserRepository userRepository;
    private final ChatRoomService chatRoomService;

    public WebSocketAuthorizationInterceptor(JwtDecoder jwtDecoder,
                                             UserRepository userRepository,
                                             ChatRoomService chatRoomService) {
        this.jwtDecoder = jwtDecoder;
        this.userRepository = userRepository;
        this.chatRoomService = chatRoomService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(
                message, StompHeaderAccessor.class);
        if (accessor == null) return message;

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            authenticate(accessor);
        } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())
                && (CHAT_LIST_DESTINATION.equals(accessor.getDestination())
                || NOTIFICATION_DESTINATION.equals(accessor.getDestination()))) {
            requireAuthenticated(accessor);
        } else if (StompCommand.SEND.equals(accessor.getCommand())) {
            authorizeRoom(accessor, ROOM_SEND_DESTINATION);
        } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            authorizeRoom(accessor, ROOM_SUBSCRIBE_DESTINATION);
        }
        return message;
    }

    private void authenticate(StompHeaderAccessor accessor) {
        String authorization = accessor.getFirstNativeHeader(HttpHeaders.AUTHORIZATION);
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new IllegalArgumentException("WebSocket Authorization header is required");
        }
        try {
            Jwt jwt = jwtDecoder.decode(authorization.substring(7));
            Integer userId = Integer.valueOf(jwt.getSubject());
            boolean active = userRepository.findById(userId)
                    .map(user -> user.getStatus() == UserStatus.ACTIVE)
                    .orElse(false);
            if (!active) {
                throw new IllegalArgumentException("Suspended or unknown WebSocket user");
            }
            JwtGrantedAuthoritiesConverter converter = new JwtGrantedAuthoritiesConverter();
            converter.setAuthoritiesClaimName("role");
            converter.setAuthorityPrefix("ROLE_");
            accessor.setUser(new JwtAuthenticationToken(
                    jwt, converter.convert(jwt), jwt.getSubject()));
        } catch (JwtException | NumberFormatException exception) {
            throw new IllegalArgumentException("Invalid WebSocket access token", exception);
        }
    }

    private void authorizeRoom(StompHeaderAccessor accessor, Pattern allowedDestination) {
        requireAuthenticated(accessor);
        Matcher matcher = allowedDestination.matcher(
                accessor.getDestination() == null ? "" : accessor.getDestination());
        if (!matcher.matches()) {
            throw new IllegalArgumentException("Unsupported WebSocket destination");
        }
        Integer roomId = Integer.valueOf(matcher.group(1));
        Integer userId = Integer.valueOf(accessor.getUser().getName());
        chatRoomService.assertParticipant(roomId, userId);
    }

    private void requireAuthenticated(StompHeaderAccessor accessor) {
        if (accessor.getUser() == null) {
            throw new IllegalArgumentException("Authenticated WebSocket session is required");
        }
    }
}
