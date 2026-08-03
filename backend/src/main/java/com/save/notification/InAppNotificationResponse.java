package com.save.notification;

import java.time.LocalDateTime;

public record InAppNotificationResponse(
        Integer id,
        String type,
        Integer rentalId,
        Integer itemId,
        String title,
        String content,
        boolean read,
        LocalDateTime createdAt
) {
    public static InAppNotificationResponse from(InAppNotification notification) {
        return new InAppNotificationResponse(
                notification.getId(),
                notification.getType().name(),
                notification.getRental().getId(),
                notification.getRental().getItem().getId(),
                notification.getTitle(),
                notification.getContent(),
                notification.isRead(),
                notification.getCreatedAt());
    }
}
