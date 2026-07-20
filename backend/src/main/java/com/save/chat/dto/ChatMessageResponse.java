package com.save.chat.dto;

import java.time.LocalDateTime;

public record ChatMessageResponse(
        Integer messageId, Integer roomId, Integer senderId, String senderName,
        String content, LocalDateTime createdAt, boolean isRead
) {}
