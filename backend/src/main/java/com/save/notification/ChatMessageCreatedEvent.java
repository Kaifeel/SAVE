package com.save.notification;

public record ChatMessageCreatedEvent(
        Integer messageId, Integer roomId, Integer receiverId,
        String senderName, String content
) {}
