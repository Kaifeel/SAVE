package com.save.rental;

import static org.assertj.core.api.Assertions.assertThat;

import com.save.chat.domain.ChatRoom;
import com.save.chat.repository.ChatRoomRepository;
import com.save.common.BusinessException;
import com.save.item.Item;
import com.save.item.ItemRepository;
import com.save.item.ItemStatus;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class RentalTransitionLockIntegrationTest {
    @Autowired RentalService rentalService;
    @Autowired RentalRepository rentalRepository;
    @Autowired ItemRepository itemRepository;
    @Autowired UserRepository userRepository;
    @Autowired ChatRoomRepository chatRoomRepository;
    @Autowired TransactionTemplate transactionTemplate;

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
            return new TestIds(rental.getId(), lender.getId());
        });

        CyclicBarrier barrier = new CyclicBarrier(2);
        Callable<Boolean> start = transition(barrier,
                () -> rentalService.startRenting(ids.rentalId(), ids.lenderId()));
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
                new StatePair(RentalStatus.RENTING, ItemStatus.RENTED),
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

    private boolean succeeded(Future<Boolean> result) {
        try {
            return result.get();
        } catch (Exception exception) {
            throw new AssertionError(exception);
        }
    }

    private record TestIds(Integer rentalId, Integer lenderId) {}
    private record StatePair(RentalStatus rentalStatus, ItemStatus itemStatus) {}
}
