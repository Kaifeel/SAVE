package com.save.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.save.item.Item;
import com.save.rental.Rental;
import com.save.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

@ExtendWith(MockitoExtension.class)
class InAppNotificationServiceTest {
    @Mock InAppNotificationRepository repository;
    @Mock ApplicationEventPublisher eventPublisher;
    private InAppNotificationService service;
    private Rental rental;
    private User lender;
    private User borrower;

    @BeforeEach
    void setUp() {
        service = new InAppNotificationService(repository, eventPublisher);
        rental = mock(Rental.class);
        lender = mock(User.class);
        borrower = mock(User.class);
        Item item = mock(Item.class);
        when(lender.getId()).thenReturn(2);
        lenient().when(borrower.getId()).thenReturn(3);
        when(item.getId()).thenReturn(4);
        when(item.getTitle()).thenReturn("테스트 물품");
        when(rental.getId()).thenReturn(5);
        when(rental.getLender()).thenReturn(lender);
        lenient().when(rental.getBorrower()).thenReturn(borrower);
        when(rental.getItem()).thenReturn(item);
        when(repository.save(any(InAppNotification.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void storesRentalRequestForLenderAndPublishesTheStoredNotification() {
        service.rentalRequested(rental);

        InAppNotification stored = captureStoredNotification();
        assertThat(stored.getRecipient()).isSameAs(lender);
        assertThat(stored.getType()).isEqualTo(InAppNotificationType.RENTAL_REQUESTED);
        assertPublishedFor(2, InAppNotificationType.RENTAL_REQUESTED);
    }

    @Test
    void storesRentalStartForBorrower() {
        service.rentalStarted(rental);

        InAppNotification stored = captureStoredNotification();
        assertThat(stored.getRecipient()).isSameAs(borrower);
        assertThat(stored.getType()).isEqualTo(InAppNotificationType.RENTAL_APPROVED);
        assertThat(stored.getTitle()).isEqualTo("거래 시작");
        assertThat(stored.getContent()).contains("거래가 시작되었습니다");
        assertPublishedFor(3, InAppNotificationType.RENTAL_APPROVED);
    }

    @Test
    void storesRentalRejectionForBorrower() {
        service.rentalRejected(rental);

        InAppNotification stored = captureStoredNotification();
        assertThat(stored.getRecipient()).isSameAs(borrower);
        assertThat(stored.getType()).isEqualTo(InAppNotificationType.RENTAL_REJECTED);
        assertPublishedFor(3, InAppNotificationType.RENTAL_REJECTED);
    }

    private InAppNotification captureStoredNotification() {
        ArgumentCaptor<InAppNotification> stored =
                ArgumentCaptor.forClass(InAppNotification.class);
        verify(repository).save(stored.capture());
        return stored.getValue();
    }

    private void assertPublishedFor(Integer recipientId, InAppNotificationType type) {
        ArgumentCaptor<InAppNotificationCreatedEvent> event =
                ArgumentCaptor.forClass(InAppNotificationCreatedEvent.class);
        verify(eventPublisher).publishEvent(event.capture());
        assertThat(event.getValue().recipientId()).isEqualTo(recipientId);
        assertThat(event.getValue().notification().type()).isEqualTo(type.name());
    }
}
