package com.save.notification;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class PushNotificationService {
    private static final Logger log = LoggerFactory.getLogger(PushNotificationService.class);
    private static final String DEVICE_NOT_REGISTERED = "DeviceNotRegistered";
    private final ExpoPushClient pushClient;
    private final DeviceTokenService tokenService;
    private final PushDeliveryTicketRepository ticketRepository;

    public PushNotificationService(ExpoPushClient pushClient, DeviceTokenService tokenService,
                                   PushDeliveryTicketRepository ticketRepository) {
        this.pushClient = pushClient;
        this.tokenService = tokenService;
        this.ticketRepository = ticketRepository;
    }

    public void sendChatMessage(ChatMessageCreatedEvent event) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("type", "CHAT_MESSAGE");
        data.put("roomId", event.roomId());
        data.put("messageId", event.messageId());
        send(event.receiverId(), event.senderName() + "님의 메시지",
                abbreviate(event.content(), 100), data);
    }

    public void sendInAppNotification(InAppNotificationCreatedEvent event) {
        InAppNotificationResponse notification = event.notification();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("type", notification.type());
        data.put("rentalId", notification.rentalId());
        data.put("itemId", notification.itemId());
        send(event.recipientId(), notification.title(), notification.content(), data);
    }

    private void send(Integer recipientId, String title, String body, Map<String, Object> data) {
        if (!pushClient.enabled()) return;
        try {
            List<UserDeviceToken> devices = tokenService.activeTokens(recipientId);
            if (devices.isEmpty()) return;
            List<ExpoPushMessage> messages = devices.stream()
                    .map(device -> new ExpoPushMessage(
                            device.getToken(), title, body, Map.copyOf(data)))
                    .toList();
            List<ExpoPushTicketResponse> responses = pushClient.send(messages);
            for (int index = 0; index < responses.size(); index++) {
                handleResponse(devices.get(index), responses.get(index));
            }
        } catch (RuntimeException exception) {
            log.warn("Expo push delivery failed for user {}", recipientId, exception);
        }
    }

    private void handleResponse(UserDeviceToken device, ExpoPushTicketResponse response) {
        if (response.ok() && response.id() != null) {
            ticketRepository.save(new PushDeliveryTicket(response.id(), device));
        } else if (DEVICE_NOT_REGISTERED.equals(response.errorCode())) {
            tokenService.disable(device.getToken());
        } else {
            log.warn("Expo push ticket failed for device {}: {}",
                    device.getId(), response.errorCode());
        }
    }

    private String abbreviate(String text, int max) {
        return text.length() <= max ? text : text.substring(0, max - 1) + "…";
    }
}
