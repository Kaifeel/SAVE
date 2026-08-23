package com.save.chat;

import com.save.chat.config.WebSocketAuthorizationInterceptor;
import com.save.chat.service.ChatRoomService;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import java.security.Principal;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class WebSocketSecurityIntegrationTest {

    @Test
    void connectWithoutJwtIsRejected() {
        WebSocketAuthorizationInterceptor interceptor =
                new WebSocketAuthorizationInterceptor(null, null, null);
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        Message<byte[]> message = MessageBuilder.createMessage(
                new byte[0], accessor.getMessageHeaders());

        assertThatThrownBy(() -> interceptor.preSend(message, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Authorization");
    }

    @Test
    void authenticatedUserCanSubscribeToPersonalChatList() {
        WebSocketAuthorizationInterceptor interceptor =
                new WebSocketAuthorizationInterceptor(null, null, null);
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/user/queue/chat-list");
        accessor.setUser((Principal) () -> "7");
        Message<byte[]> message = MessageBuilder.createMessage(
                new byte[0], accessor.getMessageHeaders());

        assertThatCode(() -> interceptor.preSend(message, null)).doesNotThrowAnyException();
    }

    @Test
    void authenticatedUserCanSubscribeToPersonalNotifications() {
        WebSocketAuthorizationInterceptor interceptor =
                new WebSocketAuthorizationInterceptor(null, null, null);
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/user/queue/notifications");
        accessor.setUser((Principal) () -> "7");
        Message<byte[]> message = MessageBuilder.createMessage(
                new byte[0], accessor.getMessageHeaders());

        assertThatCode(() -> interceptor.preSend(message, null)).doesNotThrowAnyException();
    }

    @Test
    void unauthenticatedUserCannotSubscribeToPersonalNotifications() {
        WebSocketAuthorizationInterceptor interceptor =
                new WebSocketAuthorizationInterceptor(null, null, null);
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/user/queue/notifications");
        Message<byte[]> message = MessageBuilder.createMessage(
                new byte[0], accessor.getMessageHeaders());

        assertThatThrownBy(() -> interceptor.preSend(message, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Authenticated");
    }

    @Test
    void authenticatedUserCannotSendToRoomTopic() {
        ChatRoomService chatRoomService = mock(ChatRoomService.class);
        WebSocketAuthorizationInterceptor interceptor =
                new WebSocketAuthorizationInterceptor(null, null, chatRoomService);

        assertThatThrownBy(() -> interceptor.preSend(
                roomMessage(StompCommand.SEND, "/topic/chats/rooms/3"), null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported WebSocket destination");
        verifyNoInteractions(chatRoomService);
    }

    @Test
    void authenticatedUserCannotSubscribeToRoomApplicationDestination() {
        ChatRoomService chatRoomService = mock(ChatRoomService.class);
        WebSocketAuthorizationInterceptor interceptor =
                new WebSocketAuthorizationInterceptor(null, null, chatRoomService);

        assertThatThrownBy(() -> interceptor.preSend(
                roomMessage(StompCommand.SUBSCRIBE, "/app/chats/rooms/3/messages"), null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported WebSocket destination");
        verifyNoInteractions(chatRoomService);
    }

    @Test
    void authenticatedParticipantCanSendToRoomApplicationDestination() {
        ChatRoomService chatRoomService = mock(ChatRoomService.class);
        WebSocketAuthorizationInterceptor interceptor =
                new WebSocketAuthorizationInterceptor(null, null, chatRoomService);

        assertThatCode(() -> interceptor.preSend(
                roomMessage(StompCommand.SEND, "/app/chats/rooms/3/messages"), null))
                .doesNotThrowAnyException();
        verify(chatRoomService).assertParticipant(3, 7);
    }

    @Test
    void authenticatedParticipantCanSubscribeToRoomTopic() {
        ChatRoomService chatRoomService = mock(ChatRoomService.class);
        WebSocketAuthorizationInterceptor interceptor =
                new WebSocketAuthorizationInterceptor(null, null, chatRoomService);

        assertThatCode(() -> interceptor.preSend(
                roomMessage(StompCommand.SUBSCRIBE, "/topic/chats/rooms/3"), null))
                .doesNotThrowAnyException();
        verify(chatRoomService).assertParticipant(3, 7);
    }

    private Message<byte[]> roomMessage(StompCommand command, String destination) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        accessor.setDestination(destination);
        accessor.setUser((Principal) () -> "7");
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
