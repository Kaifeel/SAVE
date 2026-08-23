package com.save.notification;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.*;

@Component
public class ChatNotificationListener {
    private final PushNotificationService pushService;
    public ChatNotificationListener(PushNotificationService pushService) { this.pushService = pushService; }

    @Async("pushExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMessageCreated(ChatMessageCreatedEvent event) {
        pushService.sendChatMessage(event);
    }
}
