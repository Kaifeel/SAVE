package com.save.notification;

public record InAppNotificationCreatedEvent(
        Integer recipientId,
        InAppNotificationResponse notification
) {}
