package com.save.notification;

import static org.mockito.Mockito.verify;

import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;

class InAppNotificationRealtimeListenerTest {
    @Test
    void sendsCommittedNotificationToRecipientQueue() {
        SimpMessagingTemplate messagingTemplate = org.mockito.Mockito.mock(SimpMessagingTemplate.class);
        InAppNotificationRealtimeListener listener =
                new InAppNotificationRealtimeListener(messagingTemplate);
        InAppNotificationResponse response = new InAppNotificationResponse(
                3, "RENTAL_REQUESTED", 7, 9, "새 대여 요청", "요청이 도착했습니다.",
                false, LocalDateTime.parse("2026-08-03T12:00:00"));

        listener.onCreated(new InAppNotificationCreatedEvent(2, response));

        verify(messagingTemplate).convertAndSendToUser(
                "2", "/queue/notifications", response);
    }
}
