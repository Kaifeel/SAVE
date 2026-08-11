package com.save.review;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.assertj.core.api.Assertions.assertThat;

import com.save.chat.domain.ChatRoom;
import com.save.chat.repository.ChatRoomRepository;
import com.save.item.Item;
import com.save.item.ItemRepository;
import com.save.rental.Rental;
import com.save.rental.RentalRepository;
import com.save.rental.RentalStatus;
import com.save.user.User;
import com.save.user.UserRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(ReviewSubmissionIntegrationTest.ClockConfig.class)
class ReviewSubmissionIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired ItemRepository itemRepository;
    @Autowired ChatRoomRepository chatRoomRepository;
    @Autowired RentalRepository rentalRepository;
    @Autowired ReviewRepository reviewRepository;
    @Autowired MutableClock clock;

    @BeforeEach
    void resetClock() {
        clock.setInstant(Instant.parse("2026-08-07T03:00:00Z"));
    }

    @Test
    void firstReviewIsStoredWithoutExposingItsContent() throws Exception {
        TestRental fixture = returnedRental(clock.instant().minus(Duration.ofDays(1)));

        mockMvc.perform(post("/api/v1/rentals/{rentalId}/reviews", fixture.rentalId())
                        .with(jwt().jwt(token -> token.subject(fixture.lenderId().toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"rating":5,"content":"약속 시간을 잘 지켜줬어요."}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.review_state").value("SUBMITTED_WAITING"))
                .andExpect(jsonPath("$.review").doesNotExist());

        Review saved = reviewRepository.findAll().get(0);
        assertThat(saved.getReviewer().getId()).isEqualTo(fixture.lenderId());
        assertThat(saved.getReviewee().getId()).isEqualTo(fixture.borrowerId());
    }

    @Test
    void secondReviewPublishesTheNewReviewImmediately() throws Exception {
        TestRental fixture = returnedRental(clock.instant().minus(Duration.ofDays(1)));
        submit(fixture.rentalId(), fixture.lenderId(), 5, "친절한 이용자였어요.")
                .andExpect(status().isCreated());

        submit(fixture.rentalId(), fixture.borrowerId(), 4, "깨끗한 물품이었어요.")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.review_state").value("PUBLISHED"))
                .andExpect(jsonPath("$.review.rating").value(4))
                .andExpect(jsonPath("$.review.content").value("깨끗한 물품이었어요."));
    }

    @Test
    void rejectsOutsidersNonReturnedRentalsAndDuplicates() throws Exception {
        TestRental returned = returnedRental(clock.instant().minus(Duration.ofDays(1)));
        User outsider = userRepository.save(new User("후기 외부인"));

        submit(returned.rentalId(), outsider.getId(), 5, "외부인 후기")
                .andExpect(status().isForbidden());

        TestRental renting = rentingRental();
        submit(renting.rentalId(), renting.lenderId(), 5, "아직 대여 중")
                .andExpect(status().isConflict());

        submit(returned.rentalId(), returned.lenderId(), 5, "첫 후기")
                .andExpect(status().isCreated());
        submit(returned.rentalId(), returned.lenderId(), 4, "중복 후기")
                .andExpect(status().isConflict());
    }

    @Test
    void validatesRatingAndTrimmedContent() throws Exception {
        TestRental fixture = returnedRental(clock.instant().minus(Duration.ofDays(1)));

        submit(fixture.rentalId(), fixture.lenderId(), 0, "별점 오류")
                .andExpect(status().isBadRequest());
        submit(fixture.rentalId(), fixture.lenderId(), 6, "별점 오류")
                .andExpect(status().isBadRequest());
        submit(fixture.rentalId(), fixture.lenderId(), 5, "   ")
                .andExpect(status().isBadRequest());
        submit(fixture.rentalId(), fixture.lenderId(), 5, "가".repeat(501))
                .andExpect(status().isBadRequest());
    }

    @Test
    void acceptsBeforeDeadlineAndRejectsAtDeadline() throws Exception {
        TestRental beforeDeadline = returnedRental(
                clock.instant().minus(Duration.ofDays(7)).plusNanos(1));
        submit(beforeDeadline.rentalId(), beforeDeadline.lenderId(), 5, "기한 직전 후기")
                .andExpect(status().isCreated());

        TestRental atDeadline = returnedRental(clock.instant().minus(Duration.ofDays(7)));
        submit(atDeadline.rentalId(), atDeadline.lenderId(), 5, "기한 종료 후기")
                .andExpect(status().isConflict());
    }

    @Test
    void rentalResponseShowsTheCurrentUsersReviewWorkflowState() throws Exception {
        TestRental fixture = returnedRental(clock.instant().minus(Duration.ofDays(1)));

        mockMvc.perform(get("/api/v1/rentals/{rentalId}", fixture.rentalId())
                        .with(jwt().jwt(token -> token.subject(fixture.lenderId().toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.review_state").value("AVAILABLE"))
                .andExpect(jsonPath("$.review_deadline").value("2026-08-13T03:00:00Z"));
    }

    private org.springframework.test.web.servlet.ResultActions submit(
            Integer rentalId, Integer userId, int rating, String content) throws Exception {
        return mockMvc.perform(post("/api/v1/rentals/{rentalId}/reviews", rentalId)
                .with(jwt().jwt(token -> token.subject(userId.toString())))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"rating\":" + rating + ",\"content\":\"" + content + "\"}"));
    }

    private TestRental returnedRental(Instant returnedAt) {
        Rental rental = rental(RentalStatus.RENTING);
        rental.returnItem(returnedAt);
        rentalRepository.save(rental);
        return ids(rental);
    }

    private TestRental rentingRental() {
        Rental rental = rental(RentalStatus.RENTING);
        rentalRepository.save(rental);
        return ids(rental);
    }

    private Rental rental(RentalStatus status) {
        User lender = userRepository.save(new User("후기 대여자"));
        User borrower = userRepository.save(new User("후기 대여 신청자"));
        Item item = itemRepository.save(new Item("후기 물품", lender));
        ChatRoom room = chatRoomRepository.save(new ChatRoom(item, borrower, lender));
        Rental rental = new Rental(item, borrower, lender, room,
                LocalDateTime.of(2026, 8, 1, 9, 0),
                LocalDateTime.of(2026, 8, 2, 9, 0), 10_000);
        rental.changeStatus(status);
        return rental;
    }

    private TestRental ids(Rental rental) {
        return new TestRental(rental.getId(), rental.getLender().getId(),
                rental.getBorrower().getId());
    }

    private record TestRental(Integer rentalId, Integer lenderId, Integer borrowerId) {}

    @TestConfiguration
    static class ClockConfig {
        @Bean
        @Primary
        MutableClock reviewTestClock() {
            return new MutableClock(Instant.parse("2026-08-07T03:00:00Z"));
        }
    }

    static class MutableClock extends Clock {
        private final AtomicReference<Instant> instant;

        MutableClock(Instant instant) {
            this.instant = new AtomicReference<>(instant);
        }

        void setInstant(Instant value) {
            instant.set(value);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant.get();
        }
    }
}
