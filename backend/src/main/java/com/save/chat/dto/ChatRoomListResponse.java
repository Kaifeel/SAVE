package com.save.chat.dto;

import java.time.LocalDateTime;

public record ChatRoomListResponse(
        Integer chatRoomId, Integer itemId, String itemTitle,
        Integer opponentId, String opponentName,
        String lastMessage, LocalDateTime lastMessageAt, long unreadCount, LocalDateTime createdAt
) {
    public ChatRoomListResponse(Integer chatRoomId, Integer itemId, String itemTitle,
            Integer opponentId, String opponentName, String lastMessage,
            LocalDateTime lastMessageAt, long unreadCount) {
        this(chatRoomId, itemId, itemTitle, opponentId, opponentName,
                lastMessage, lastMessageAt, unreadCount, null);
    }

    public LocalDateTime activityAt() {
        return lastMessageAt != null ? lastMessageAt : createdAt;
    }
}
