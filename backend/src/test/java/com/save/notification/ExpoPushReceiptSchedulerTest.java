package com.save.notification;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ExpoPushReceiptSchedulerTest {
    private static final Instant NOW = Instant.parse("2026-08-23T08:00:00Z");
    private final PushDeliveryTicketRepository ticketRepository =
            mock(PushDeliveryTicketRepository.class);
    private final ExpoPushClient client = mock(ExpoPushClient.class);
    private final DeviceTokenService tokenService = mock(DeviceTokenService.class);
    private final ExpoPushReceiptScheduler scheduler = new ExpoPushReceiptScheduler(
            ticketRepository, client, tokenService, Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void claimsOnlyPendingTicketsAtLeastFifteenMinutesOld() {
        when(client.enabled()).thenReturn(true);
        when(ticketRepository.findTop500ByStatusAndCreatedAtBeforeOrderByCreatedAtAsc(
                PushDeliveryStatus.PENDING, NOW.minusSeconds(15 * 60)))
                .thenReturn(List.of());

        scheduler.reconcileReceipts();

        verify(ticketRepository).findTop500ByStatusAndCreatedAtBeforeOrderByCreatedAtAsc(
                PushDeliveryStatus.PENDING, NOW.minusSeconds(15 * 60));
        verify(client, never()).getReceipts(org.mockito.ArgumentMatchers.anySet());
    }

    @Test
    void marksDeliveredAndDisablesPermanentlyInvalidDevices() {
        when(client.enabled()).thenReturn(true);
        PushDeliveryTicket delivered = ticket("ticket-ok", "ExpoPushToken[ok]");
        PushDeliveryTicket invalid = ticket("ticket-bad", "ExpoPushToken[bad]");
        when(ticketRepository.findTop500ByStatusAndCreatedAtBeforeOrderByCreatedAtAsc(
                PushDeliveryStatus.PENDING, NOW.minusSeconds(15 * 60)))
                .thenReturn(List.of(delivered, invalid));
        Map<String, ExpoPushTicketResponse> receipts = new LinkedHashMap<>();
        receipts.put("ticket-ok", new ExpoPushTicketResponse("ok", null, null, null));
        receipts.put("ticket-bad", new ExpoPushTicketResponse(
                "error", null, "DeviceNotRegistered", "Unregistered"));
        when(client.getReceipts(org.mockito.ArgumentMatchers.anySet())).thenReturn(receipts);

        scheduler.reconcileReceipts();

        verify(delivered).delivered(NOW);
        verify(invalid).failed("DeviceNotRegistered", NOW);
        verify(tokenService).disable("ExpoPushToken[bad]");
        verify(ticketRepository).saveAll(List.of(delivered, invalid));
    }

    @Test
    void transientHttpFailureLeavesTicketsPending() {
        when(client.enabled()).thenReturn(true);
        PushDeliveryTicket pending = ticket("ticket-pending", "ExpoPushToken[pending]");
        when(ticketRepository.findTop500ByStatusAndCreatedAtBeforeOrderByCreatedAtAsc(
                PushDeliveryStatus.PENDING, NOW.minusSeconds(15 * 60)))
                .thenReturn(List.of(pending));
        when(client.getReceipts(org.mockito.ArgumentMatchers.anySet()))
                .thenThrow(new IllegalStateException("Expo unavailable"));

        scheduler.reconcileReceipts();

        verify(pending, never()).delivered(org.mockito.ArgumentMatchers.any());
        verify(pending, never()).failed(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
        verify(ticketRepository, never()).saveAll(org.mockito.ArgumentMatchers.any());
        verifyNoInteractions(tokenService);
    }

    private PushDeliveryTicket ticket(String ticketId, String token) {
        PushDeliveryTicket ticket = mock(PushDeliveryTicket.class);
        UserDeviceToken device = mock(UserDeviceToken.class);
        when(ticket.getTicketId()).thenReturn(ticketId);
        when(ticket.getDeviceToken()).thenReturn(device);
        when(device.getToken()).thenReturn(token);
        return ticket;
    }
}
