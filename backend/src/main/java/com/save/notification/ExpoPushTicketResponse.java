package com.save.notification;

public record ExpoPushTicketResponse(
        String status,
        String id,
        String errorCode,
        String message
) {
    public boolean ok() {
        return "ok".equals(status);
    }
}
