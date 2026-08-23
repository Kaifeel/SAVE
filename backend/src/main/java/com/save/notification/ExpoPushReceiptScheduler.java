package com.save.notification;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ExpoPushReceiptScheduler {
    private static final Logger log = LoggerFactory.getLogger(ExpoPushReceiptScheduler.class);
    private static final Duration RECEIPT_AGE = Duration.ofMinutes(15);
    private static final String DEVICE_NOT_REGISTERED = "DeviceNotRegistered";
    private final PushDeliveryTicketRepository ticketRepository;
    private final ExpoPushClient pushClient;
    private final DeviceTokenService tokenService;
    private final Clock clock;

    public ExpoPushReceiptScheduler(PushDeliveryTicketRepository ticketRepository,
                                    ExpoPushClient pushClient,
                                    DeviceTokenService tokenService,
                                    Clock clock) {
        this.ticketRepository = ticketRepository;
        this.pushClient = pushClient;
        this.tokenService = tokenService;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "${expo.push.receipt-poll-delay:60000}")
    @Transactional
    public void reconcileReceipts() {
        if (!pushClient.enabled()) return;
        Instant now = clock.instant();
        List<PushDeliveryTicket> due = ticketRepository
                .findTop500ByStatusAndCreatedAtBeforeOrderByCreatedAtAsc(
                        PushDeliveryStatus.PENDING, now.minus(RECEIPT_AGE));
        if (due.isEmpty()) return;

        try {
            LinkedHashSet<String> ids = new LinkedHashSet<>(
                    due.stream().map(PushDeliveryTicket::getTicketId).toList());
            Map<String, ExpoPushTicketResponse> receipts = pushClient.getReceipts(ids);
            List<PushDeliveryTicket> checked = new ArrayList<>();
            for (PushDeliveryTicket ticket : due) {
                ExpoPushTicketResponse receipt = receipts.get(ticket.getTicketId());
                if (receipt == null) continue;
                if (receipt.ok()) {
                    ticket.delivered(now);
                } else {
                    ticket.failed(receipt.errorCode(), now);
                    if (DEVICE_NOT_REGISTERED.equals(receipt.errorCode())) {
                        disableInvalidToken(ticket);
                    }
                }
                checked.add(ticket);
            }
            if (!checked.isEmpty()) ticketRepository.saveAll(checked);
        } catch (RuntimeException exception) {
            log.warn("Expo push receipt reconciliation failed; pending tickets will retry", exception);
        }
    }

    private void disableInvalidToken(PushDeliveryTicket ticket) {
        try {
            tokenService.disable(ticket.getDeviceToken().getToken());
        } catch (RuntimeException exception) {
            log.warn("Failed to disable invalid Expo token for ticket {}",
                    ticket.getTicketId(), exception);
        }
    }
}
