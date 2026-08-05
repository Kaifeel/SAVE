package com.save.notification;

import com.save.common.BusinessException;
import com.save.rental.Rental;
import java.util.List;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InAppNotificationService {
    private final InAppNotificationRepository repository;
    private final ApplicationEventPublisher eventPublisher;

    public InAppNotificationService(InAppNotificationRepository repository,
                                    ApplicationEventPublisher eventPublisher) {
        this.repository = repository;
        this.eventPublisher = eventPublisher;
    }

    public void rentalRequested(Rental rental) {
        create(rental, rental.getLender().getId(), InAppNotificationType.RENTAL_REQUESTED,
                "새 대여 요청", rental.getItem().getTitle() + " 대여 요청이 도착했습니다.");
    }

    public void rentalStarted(Rental rental) {
        create(rental, rental.getBorrower().getId(), InAppNotificationType.RENTAL_APPROVED,
                "거래 시작", rental.getItem().getTitle() + " 거래가 시작되었습니다.");
    }

    public void rentalRejected(Rental rental) {
        create(rental, rental.getBorrower().getId(), InAppNotificationType.RENTAL_REJECTED,
                "대여 요청 거절", rental.getItem().getTitle() + " 대여 요청이 거절되었습니다.");
    }

    private void create(Rental rental, Integer recipientId, InAppNotificationType type,
                        String title, String content) {
        var recipient = rental.getLender().getId().equals(recipientId)
                ? rental.getLender() : rental.getBorrower();
        InAppNotification saved = repository.save(
                new InAppNotification(recipient, rental, type, title, content));
        eventPublisher.publishEvent(new InAppNotificationCreatedEvent(
                recipientId, InAppNotificationResponse.from(saved)));
    }

    @Transactional(readOnly = true)
    public List<InAppNotificationResponse> getMine(Integer userId) {
        return repository.findTop50ByRecipientIdOrderByCreatedAtDesc(userId)
                .stream().map(InAppNotificationResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public long unreadCount(Integer userId) {
        return repository.countByRecipientIdAndReadFalse(userId);
    }

    @Transactional
    public InAppNotificationResponse markRead(Integer notificationId, Integer userId) {
        InAppNotification notification = repository.findByIdAndRecipientId(notificationId, userId)
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.NOT_FOUND, "알림이 존재하지 않습니다."));
        notification.markRead();
        return InAppNotificationResponse.from(notification);
    }

    @Transactional
    public void markAllRead(Integer userId) {
        repository.markAllRead(userId);
    }
}
