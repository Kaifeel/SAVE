package com.save.rental;

import static org.assertj.core.api.Assertions.assertThat;

import com.save.chat.domain.ChatRoom;
import com.save.chat.repository.ChatRoomRepository;
import com.save.common.BusinessException;
import com.save.item.Item;
import com.save.item.ItemRepository;
import com.save.item.ItemStatus;
import com.save.notification.InAppNotificationRepository;
import com.save.user.User;
import com.save.user.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest
class RentalTransitionLockIntegrationTest {
    @org.springframework.boot.test.mock.mockito.MockBean
    com.save.notification.FcmPushClient fcmPushClient;
    @Autowired RentalService rentalService;
    @Autowired RentalRepository rentalRepository;
    @Autowired ItemRepository itemRepository;
    @Autowired UserRepository userRepository;
    @Autowired ChatRoomRepository chatRoomRepository;
    @Autowired InAppNotificationRepository notificationRepository;
    @Autowired TransactionTemplate transactionTemplate;
    private TestIds testIds;

    @AfterEach
    void cleanUpCreatedGraph() {
        if (testIds == null) return;
        transactionTemplate.executeWithoutResult(status -> {
            var notifications = notificationRepository.findAll().stream()
                    .filter(notification -> notification.getRental().getId()
                            .equals(testIds.rentalId()))
                    .toList();
            notificationRepository.deleteAll(notifications);
            notificationRepository.flush();
            rentalRepository.deleteById(testIds.rentalId());
            rentalRepository.flush();
            chatRoomRepository.deleteById(testIds.chatRoomId());
            chatRoomRepository.flush();
            itemRepository.deleteById(testIds.itemId());
            itemRepository.flush();
            userRepository.deleteAllById(List.of(testIds.borrowerId(), testIds.lenderId()));
            userRepository.flush();
        });
    }

    @Test
    void serializesConflictingStartAndRejectTransitions() throws Exception {
        TestIds ids = transactionTemplate.execute(status -> {
            User lender = userRepository.save(new User("잠금 대여자"));
            User borrower = userRepository.save(new User("잠금 신청자"));
            Item item = itemRepository.save(new Item("잠금 물품", lender));
            ChatRoom room = chatRoomRepository.save(new ChatRoom(item, borrower, lender));
            Rental rental = rentalRepository.save(new Rental(
                    item, borrower, lender, room,
                    LocalDateTime.of(2026, 8, 6, 10, 0),
                    LocalDateTime.of(2026, 8, 7, 10, 0), 0));
            item.changeStatus(ItemStatus.REQUEST_PENDING);
            return new TestIds(rental.getId(), lender.getId(), borrower.getId(),
                    item.getId(), room.getId());
        });
        testIds = ids;

        CyclicBarrier barrier = new CyclicBarrier(2);
        Callable<Boolean> start = transition(barrier,
                () -> rentalService.approve(ids.rentalId(), ids.lenderId()));
        Callable<Boolean> reject = transition(barrier,
                () -> rentalService.reject(ids.rentalId(), ids.lenderId()));

        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            List<Future<Boolean>> results = executor.invokeAll(List.of(start, reject));
            long successes = results.stream().filter(this::succeeded).count();
            assertThat(successes).isEqualTo(1);
        } finally {
            executor.shutdownNow();
        }

        StatePair finalState = transactionTemplate.execute(status -> {
            Rental rental = rentalRepository.findById(ids.rentalId()).orElseThrow();
            return new StatePair(rental.getStatus(), rental.getItem().getStatus());
        });
        assertThat(finalState).isIn(
                new StatePair(RentalStatus.APPROVED, ItemStatus.RESERVED),
                new StatePair(RentalStatus.REJECTED, ItemStatus.AVAILABLE));
    }

    private Callable<Boolean> transition(CyclicBarrier barrier, Runnable action) {
        return () -> {
            barrier.await();
            try {
                action.run();
                return true;
            } catch (BusinessException exception) {
                return false;
            }
        };
    }

    private TestIds requestedRental() {
        testIds = transactionTemplate.execute(status -> {
            User lender = userRepository.save(new User("전달 대여자"));
            User borrower = userRepository.save(new User("전달 신청자"));
            Item item = itemRepository.save(new Item("전달 물품", lender));
            ChatRoom room = chatRoomRepository.save(new ChatRoom(item, borrower, lender));
            Rental rental = rentalRepository.save(new Rental(item, borrower, lender, room,
                    LocalDateTime.now(), LocalDateTime.now().plusDays(1), 0));
            item.changeStatus(ItemStatus.REQUEST_PENDING);
            return new TestIds(rental.getId(), lender.getId(), borrower.getId(), item.getId(), room.getId());
        });
        return testIds;
    }

    private void assertState(TestIds ids, RentalStatus rentalStatus, ItemStatus itemStatus) {
        transactionTemplate.executeWithoutResult(status -> {
            Rental rental = rentalRepository.findById(ids.rentalId()).orElseThrow();
            assertThat(rental.getStatus()).isEqualTo(rentalStatus);
            assertThat(rental.getItem().getStatus()).isEqualTo(itemStatus);
        });
    }

    private void rejects(Runnable action) {
        org.assertj.core.api.Assertions.assertThatThrownBy(action::run).isInstanceOf(BusinessException.class);
    }

    @Test
    void requiresApprovalBothConfirmationsAndBorrowerReturnRequest() {
        TestIds ids = requestedRental();
        rejects(() -> rentalService.startRenting(ids.rentalId(), ids.lenderId()));
        rejects(() -> rentalService.approve(ids.rentalId(), ids.borrowerId()));
        rentalService.approve(ids.rentalId(), ids.lenderId());
        assertState(ids, RentalStatus.APPROVED, ItemStatus.RESERVED);
        rejects(() -> rentalService.startRenting(ids.rentalId(), ids.borrowerId()));
        rejects(() -> rentalService.receive(ids.rentalId(), ids.lenderId()));
        RentalResponse first = rentalService.startRenting(ids.rentalId(), ids.lenderId());
        assertThat(first.lenderHandedOverAt()).isNotNull();
        assertThat(first.borrowerReceivedAt()).isNull();
        assertThat(rentalService.startRenting(ids.rentalId(), ids.lenderId()).lenderHandedOverAt())
                .isCloseTo(first.lenderHandedOverAt(), org.assertj.core.api.Assertions.within(1, java.time.temporal.ChronoUnit.MICROS));
        assertState(ids, RentalStatus.APPROVED, ItemStatus.RESERVED);
        rejects(() -> rentalService.cancel(ids.rentalId(), ids.borrowerId()));
        rentalService.receive(ids.rentalId(), ids.borrowerId());
        assertState(ids, RentalStatus.RENTING, ItemStatus.RENTED);
        rejects(() -> rentalService.returnItem(ids.rentalId(), ids.lenderId()));
        rejects(() -> rentalService.requestReturn(ids.rentalId(), ids.lenderId()));
        rentalService.requestReturn(ids.rentalId(), ids.borrowerId());
        assertState(ids, RentalStatus.RETURN_REQUESTED, ItemStatus.RENTED);
        rejects(() -> rentalService.cancel(ids.rentalId(), ids.borrowerId()));
        rejects(() -> rentalService.returnItem(ids.rentalId(), ids.borrowerId()));
        RentalResponse returned = rentalService.returnItem(ids.rentalId(), ids.lenderId());
        assertThat(returned.returnedAt()).isNotNull();
        assertThat(returned.reviewState()).isEqualTo(com.save.review.ReviewState.AVAILABLE);
        assertState(ids, RentalStatus.RETURNED, ItemStatus.AVAILABLE);
        rejects(() -> rentalService.returnItem(ids.rentalId(), ids.lenderId()));
    }

    @Test
    void supportsReceiptFirstAndConcurrentConfirmations() throws Exception {
        TestIds ids = requestedRental();
        rentalService.approve(ids.rentalId(), ids.lenderId());
        rentalService.receive(ids.rentalId(), ids.borrowerId());
        assertState(ids, RentalStatus.APPROVED, ItemStatus.RESERVED);
        rejects(() -> rentalService.cancel(ids.rentalId(), ids.borrowerId()));
        rentalService.startRenting(ids.rentalId(), ids.lenderId());
        assertState(ids, RentalStatus.RENTING, ItemStatus.RENTED);
    }

    @Test
    void serializesSimultaneousDeliveryConfirmations() throws Exception {
        TestIds ids = requestedRental();
        rentalService.approve(ids.rentalId(), ids.lenderId());
        CyclicBarrier barrier = new CyclicBarrier(2);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            var results = executor.invokeAll(List.of(
                    transition(barrier, () -> rentalService.startRenting(ids.rentalId(), ids.lenderId())),
                    transition(barrier, () -> rentalService.receive(ids.rentalId(), ids.borrowerId()))));
            assertThat(results.stream().allMatch(this::succeeded)).isTrue();
        } finally {
            executor.shutdownNow();
        }
        assertState(ids, RentalStatus.RENTING, ItemStatus.RENTED);
    }

    @Test
    void permitsCancellationBeforeAnyDeliveryConfirmation() {
        TestIds ids = requestedRental();
        rentalService.approve(ids.rentalId(), ids.lenderId());
        rentalService.cancel(ids.rentalId(), ids.borrowerId());
        assertState(ids, RentalStatus.CANCELED, ItemStatus.AVAILABLE);
    }

    private boolean succeeded(Future<Boolean> result) {
        try {
            return result.get();
        } catch (Exception exception) {
            throw new AssertionError(exception);
        }
    }

    private record TestIds(Integer rentalId, Integer lenderId, Integer borrowerId,
                           Integer itemId, Integer chatRoomId) {}
    private record StatePair(RentalStatus rentalStatus, ItemStatus itemStatus) {}
}
