package com.save.chat.dto;

import java.time.LocalDateTime;

public record ChatRoomListResponse(
        Integer roomId, Integer itemId, String itemTitle,
        Integer opponentId, String opponentName,
        String lastMessage, LocalDateTime lastMessageAt, long unreadCount
) {}
