package com.save.chat;

import static java.util.concurrent.TimeUnit.SECONDS;
import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.save.chat.domain.ChatRoom;
import com.save.chat.repository.ChatMessageRepository;
import com.save.chat.repository.ChatRoomRepository;
import com.save.item.Item;
import com.save.item.ItemRepository;
import com.save.security.JwtTokenService;
import com.save.user.User;
import com.save.user.UserRepository;
import java.lang.reflect.Type;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class WebSocketBrokerIntegrationTest {
    @LocalServerPort int port;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired ItemRepository itemRepository;
    @Autowired ChatRoomRepository roomRepository;
    @Autowired ChatMessageRepository messageRepository;
    @Autowired JwtTokenService jwtTokenService;
    private Integer roomId;
    private Integer itemId;
    private Integer borrowerId;
    private Integer lenderId;

    @AfterEach
    void cleanUpCreatedData() {
        if (roomId != null) {
            messageRepository.deleteAll(messageRepository.findByChatRoomIdOrderByIdDesc(
                    roomId, PageRequest.of(0, 100)));
            roomRepository.findById(roomId).ifPresent(roomRepository::delete);
        }
        if (itemId != null) itemRepository.findById(itemId).ifPresent(itemRepository::delete);
        if (borrowerId != null) {
            userRepository.findById(borrowerId).ifPresent(userRepository::delete);
        }
        if (lenderId != null) userRepository.findById(lenderId).ifPresent(userRepository::delete);
    }

    @Test
    void authorizedParticipantReceivesSavedMessageAndInvalidDirectionIsRejected() throws Exception {
        User lender = userRepository.save(new User("브로커 대여자"));
        User borrower = userRepository.save(new User("브로커 차용자"));
        Item item = itemRepository.save(new Item("브로커 테스트 물품", lender));
        ChatRoom room = roomRepository.save(new ChatRoom(item, borrower, lender));
        lenderId = lender.getId();
        borrowerId = borrower.getId();
        itemId = item.getId();
        roomId = room.getId();
        String accessToken = jwtTokenService.issue(borrower);

        WebSocketStompClient stompClient = new WebSocketStompClient(new StandardWebSocketClient());
        StompSession deliverySession = null;
        StompSession invalidSession = null;
        try {
            CompletableFuture<JsonNode> received = new CompletableFuture<>();
            deliverySession = connect(stompClient, accessToken, new StompSessionHandlerAdapter() {});
            deliverySession.subscribe("/topic/chats/rooms/" + room.getId(), jsonHandler(received));

            StompHeaders sendHeaders = new StompHeaders();
            sendHeaders.setDestination("/app/chats/rooms/" + room.getId() + "/messages");
            deliverySession.send(sendHeaders, "{\"message\":\"실제 브로커 메시지\"}".getBytes());

            JsonNode message = received.get(5, SECONDS);
            assertThat(message.get("chat_room_id").asInt()).isEqualTo(room.getId());
            assertThat(message.get("message").asText()).isEqualTo("실제 브로커 메시지");

            CompletableFuture<StompHeaders> rejected = new CompletableFuture<>();
            invalidSession = connect(stompClient, accessToken, errorHandler(rejected));
            invalidSession.subscribe(
                    "/app/chats/rooms/" + room.getId() + "/messages", jsonHandler(new CompletableFuture<>()));

            assertThat(rejected.get(5, SECONDS)).isNotNull();
        } finally {
            if (deliverySession != null && deliverySession.isConnected()) deliverySession.disconnect();
            if (invalidSession != null && invalidSession.isConnected()) invalidSession.disconnect();
            stompClient.stop();
        }
    }

    private StompSession connect(WebSocketStompClient client, String accessToken,
                                 StompSessionHandlerAdapter handler) throws Exception {
        StompHeaders connectHeaders = new StompHeaders();
        connectHeaders.add("Authorization", "Bearer " + accessToken);
        return client.connectAsync(
                "ws://localhost:" + port + "/ws-chat",
                new WebSocketHttpHeaders(), connectHeaders, handler).get(5, SECONDS);
    }

    private StompFrameHandler jsonHandler(CompletableFuture<JsonNode> future) {
        return new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return byte[].class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                try {
                    future.complete(objectMapper.readTree((byte[]) payload));
                } catch (Exception exception) {
                    future.completeExceptionally(exception);
                }
            }
        };
    }

    private StompSessionHandlerAdapter errorHandler(CompletableFuture<StompHeaders> future) {
        return new StompSessionHandlerAdapter() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return byte[].class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                future.complete(headers);
            }
        };
    }
}
