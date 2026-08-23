package com.save.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.save.user.User;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

@SuppressWarnings({"rawtypes", "unchecked"})
class PushNotificationServiceTest {
    private final ExpoPushClient client = mock(ExpoPushClient.class);
    private final DeviceTokenService tokenService = mock(DeviceTokenService.class);
    private final PushDeliveryTicketRepository ticketRepository =
            mock(PushDeliveryTicketRepository.class);
    private final PushNotificationService service =
            new PushNotificationService(client, tokenService, ticketRepository);
    private UserDeviceToken device;

    @BeforeEach
    void setUp() {
        device = new UserDeviceToken(mock(User.class),
                "ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]", DevicePlatform.ANDROID);
        when(client.enabled()).thenReturn(true);
        when(tokenService.activeTokens(9)).thenReturn(List.of(device));
    }

    @Test
    void sendsChatTitleBodyDataAndPersistsTheTicket() {
        when(client.send(any())).thenReturn(List.of(
                new ExpoPushTicketResponse("ok", "ticket-1", null, null)));
        String content = "가".repeat(120);

        service.sendChatMessage(new ChatMessageCreatedEvent(31, 7, 9, "김상대", content));

        ArgumentCaptor<List<ExpoPushMessage>> messages = ArgumentCaptor.forClass(List.class);
        verify(client).send(messages.capture());
        ExpoPushMessage message = messages.getValue().get(0);
        assertThat(message.to()).isEqualTo(device.getToken());
        assertThat(message.title()).isEqualTo("김상대님의 메시지");
        assertThat(message.body()).hasSize(100).endsWith("…");
        assertThat(message.data()).containsEntry("type", "CHAT_MESSAGE")
                .containsEntry("roomId", 7)
                .containsEntry("messageId", 31);
        verify(ticketRepository).save(any(PushDeliveryTicket.class));
    }

    @Test
    void routesRentalNotificationFieldsToExpoData() {
        when(client.send(any())).thenReturn(List.of(
                new ExpoPushTicketResponse("ok", "ticket-2", null, null)));
        InAppNotificationResponse notification = new InAppNotificationResponse(
                4, "RENTAL_REQUESTED", 18, 11, "새 대여 요청", "대여 요청이 도착했습니다.",
                false, LocalDateTime.now());

        service.sendInAppNotification(new InAppNotificationCreatedEvent(9, notification));

        ArgumentCaptor<List<ExpoPushMessage>> messages = ArgumentCaptor.forClass(List.class);
        verify(client).send(messages.capture());
        ExpoPushMessage message = messages.getValue().get(0);
        assertThat(message.title()).isEqualTo("새 대여 요청");
        assertThat(message.body()).isEqualTo("대여 요청이 도착했습니다.");
        assertThat(message.data()).containsEntry("type", "RENTAL_REQUESTED")
                .containsEntry("rentalId", 18)
                .containsEntry("itemId", 11);
    }

    @Test
    void disabledProviderIsANoOp() {
        when(client.enabled()).thenReturn(false);

        service.sendChatMessage(new ChatMessageCreatedEvent(31, 7, 9, "김상대", "내용"));

        verifyNoInteractions(tokenService, ticketRepository);
        verify(client, never()).send(any());
    }

    @Test
    void disablesAnImmediatelyUnregisteredDevice() {
        when(client.send(any())).thenReturn(List.of(new ExpoPushTicketResponse(
                "error", null, "DeviceNotRegistered", "Unregistered")));

        service.sendChatMessage(new ChatMessageCreatedEvent(31, 7, 9, "김상대", "내용"));

        verify(tokenService).disable(device.getToken());
        verifyNoInteractions(ticketRepository);
    }

    @Test
    void providerFailureDoesNotEscapeTheNotificationBoundary() {
        when(client.send(any())).thenThrow(new IllegalStateException("Expo unavailable"));

        assertThatCode(() -> service.sendChatMessage(
                new ChatMessageCreatedEvent(31, 7, 9, "김상대", "내용")))
                .doesNotThrowAnyException();
    }
}
