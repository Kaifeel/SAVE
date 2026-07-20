package com.save.notification;

import com.google.firebase.messaging.*;
import java.util.Map;
import org.slf4j.*;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

@Service
public class PushNotificationService {
    private static final Logger log = LoggerFactory.getLogger(PushNotificationService.class);
    private final ObjectProvider<FirebaseMessaging> messagingProvider;
    private final DeviceTokenService tokenService;
    public PushNotificationService(ObjectProvider<FirebaseMessaging> messagingProvider,
                                   DeviceTokenService tokenService) {
        this.messagingProvider = messagingProvider; this.tokenService = tokenService;
    }

    public void sendChatMessage(ChatMessageCreatedEvent event) {
        FirebaseMessaging messaging = messagingProvider.getIfAvailable();
        if (messaging == null) {
            log.debug("Firebase disabled; skipping notification for message {}", event.messageId());
            return;
        }
        for (UserDeviceToken device : tokenService.activeTokens(event.receiverId())) {
            Message message = Message.builder()
                    .setToken(device.getToken())
                    .setNotification(Notification.builder()
                            .setTitle(event.senderName() + "님의 메시지")
                            .setBody(abbreviate(event.content(), 100)).build())
                    .putAllData(Map.of(
                            "type", "CHAT_MESSAGE",
                            "roomId", event.roomId().toString(),
                            "messageId", event.messageId().toString()))
                    .build();
            try {
                messaging.send(message);
            } catch (FirebaseMessagingException exception) {
                if (exception.getMessagingErrorCode() == MessagingErrorCode.UNREGISTERED) {
                    tokenService.disable(device.getToken());
                }
                log.warn("FCM send failed: user={}, code={}", event.receiverId(),
                        exception.getMessagingErrorCode());
            }
        }
    }

    private String abbreviate(String text, int max) {
        return text.length() <= max ? text : text.substring(0, max - 1) + "…";
    }
}
