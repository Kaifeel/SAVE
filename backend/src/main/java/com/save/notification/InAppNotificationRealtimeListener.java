package com.save.notification;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class InAppNotificationRealtimeListener {
    private final SimpMessagingTemplate messagingTemplate;

    public InAppNotificationRealtimeListener(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCreated(InAppNotificationCreatedEvent event) {
        messagingTemplate.convertAndSendToUser(
                event.recipientId().toString(), "/queue/notifications", event.notification());
    }
}
