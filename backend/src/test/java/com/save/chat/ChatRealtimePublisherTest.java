package com.save.chat;

import com.save.chat.dto.ChatMessageResponse;
import com.save.chat.dto.ChatRoomListResponse;
import com.save.chat.service.ChatRealtimePublisher;
import com.save.chat.service.ChatRoomService;
import java.time.LocalDateTime;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

class ChatRealtimePublisherTest {

    @Test
    void publishesTheMessageAndPersonalListSummariesToBothParticipants() {
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
        ChatRoomService chatRoomService = mock(ChatRoomService.class);
        ChatRealtimePublisher publisher = new ChatRealtimePublisher(
                messagingTemplate, chatRoomService);
        LocalDateTime sentAt = LocalDateTime.of(2026, 8, 3, 13, 20);
        ChatMessageResponse message = new ChatMessageResponse(
                21, 3, 7, "보낸 사람", "새 메시지", false, sentAt);
        ChatRoomListResponse senderSummary = new ChatRoomListResponse(
                3, 9, "우산", 8, "받는 사람", "새 메시지", sentAt, 0);
        ChatRoomListResponse receiverSummary = new ChatRoomListResponse(
                3, 9, "우산", 7, "보낸 사람", "새 메시지", sentAt, 1);
        when(chatRoomService.getParticipantSummaries(3))
                .thenReturn(Map.of(7, senderSummary, 8, receiverSummary));

        publisher.publishMessage(3, message);

        verify(messagingTemplate).convertAndSend("/topic/chats/rooms/3", message);
        verify(messagingTemplate).convertAndSendToUser(
                "7", "/queue/chat-list", senderSummary);
        verify(messagingTemplate).convertAndSendToUser(
                "8", "/queue/chat-list", receiverSummary);
    }

    @Test
    void isolatesPersonalDeliveryFailuresFromTheSavedMessageResponse() {
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
        ChatRoomService chatRoomService = mock(ChatRoomService.class);
        ChatRealtimePublisher publisher = new ChatRealtimePublisher(
                messagingTemplate, chatRoomService);
        LocalDateTime sentAt = LocalDateTime.of(2026, 8, 3, 13, 20);
        ChatMessageResponse message = new ChatMessageResponse(
                21, 3, 7, "보낸 사람", "새 메시지", false, sentAt);
        ChatRoomListResponse senderSummary = new ChatRoomListResponse(
                3, 9, "우산", 8, "받는 사람", "새 메시지", sentAt, 0);
        ChatRoomListResponse receiverSummary = new ChatRoomListResponse(
                3, 9, "우산", 7, "보낸 사람", "새 메시지", sentAt, 1);
        when(chatRoomService.getParticipantSummaries(3))
                .thenReturn(Map.of(7, senderSummary, 8, receiverSummary));
        doThrow(new IllegalStateException("broker unavailable"))
                .when(messagingTemplate)
                .convertAndSendToUser("7", "/queue/chat-list", senderSummary);

        assertDoesNotThrow(() -> publisher.publishMessage(3, message));

        verify(messagingTemplate).convertAndSendToUser(
                "8", "/queue/chat-list", receiverSummary);
    }
}
