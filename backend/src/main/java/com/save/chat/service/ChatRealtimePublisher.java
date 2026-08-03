package com.save.chat.service;

import com.save.chat.dto.ChatMessageResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class ChatRealtimePublisher {
    private static final Logger log = LoggerFactory.getLogger(ChatRealtimePublisher.class);

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatRoomService chatRoomService;

    public ChatRealtimePublisher(SimpMessagingTemplate messagingTemplate,
                                 ChatRoomService chatRoomService) {
        this.messagingTemplate = messagingTemplate;
        this.chatRoomService = chatRoomService;
    }

    public void publishMessage(Integer roomId, ChatMessageResponse response) {
        try {
            messagingTemplate.convertAndSend("/topic/chats/rooms/" + roomId, response);
        } catch (RuntimeException exception) {
            log.warn("Failed to publish chat message for room {}", roomId, exception);
        }
        publishChatList(roomId);
    }

    public void publishChatList(Integer roomId) {
        try {
            chatRoomService.getParticipantSummaries(roomId).forEach((userId, summary) -> {
                try {
                    messagingTemplate.convertAndSendToUser(
                            userId.toString(), "/queue/chat-list", summary);
                } catch (RuntimeException exception) {
                    log.warn("Failed to publish chat list for room {} and user {}",
                            roomId, userId, exception);
                }
            });
        } catch (RuntimeException exception) {
            log.warn("Failed to load chat list summaries for room {}", roomId, exception);
        }
    }
}
