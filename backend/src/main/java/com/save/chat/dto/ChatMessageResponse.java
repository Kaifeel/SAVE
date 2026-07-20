package com.save.chat.dto;

import java.time.LocalDateTime;

public record ChatMessageResponse(
        Integer id, Integer chatRoomId, Integer senderId, String senderName,
        String message, boolean isRead, LocalDateTime createdAt
) {}
