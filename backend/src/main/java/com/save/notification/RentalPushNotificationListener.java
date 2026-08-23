package com.save.notification;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class RentalPushNotificationListener {
    private final PushNotificationService pushService;

    public RentalPushNotificationListener(PushNotificationService pushService) {
        this.pushService = pushService;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onNotificationCreated(InAppNotificationCreatedEvent event) {
        pushService.sendInAppNotification(event);
    }
}
