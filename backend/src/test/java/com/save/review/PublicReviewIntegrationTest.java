package com.save.review;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(PublicReviewIntegrationTest.ClockConfig.class)
class PublicReviewIntegrationTest {

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
    void hidesTheFirstReviewThenPublishesItWhenBothParticipantsSubmit() throws Exception {
        TestRental fixture = returnedRental(clock.instant().minus(Duration.ofDays(1)));
        reviewRepository.save(new Review(fixture.rental(), fixture.borrower(), fixture.lender(),
                5, "정말 친절한 물품 주인이에요.", clock.instant().minusSeconds(60)));

        mockMvc.perform(get("/api/v1/users/{userId}/reviews", fixture.lender().getId())
                        .with(jwt().jwt(token -> token.subject(fixture.borrower().getId().toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
        mockMvc.perform(get("/api/v1/users/{userId}/profile", fixture.lender().getId())
                        .with(jwt().jwt(token -> token.subject(fixture.borrower().getId().toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rating").value(0.0))
                .andExpect(jsonPath("$.review_count").value(0));

        reviewRepository.save(new Review(fixture.rental(), fixture.lender(), fixture.borrower(),
                4, "약속을 잘 지킨 이용자예요.", clock.instant()));

        mockMvc.perform(get("/api/v1/users/{userId}/reviews", fixture.lender().getId())
                        .with(jwt().jwt(token -> token.subject(fixture.borrower().getId().toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].rating").value(5))
                .andExpect(jsonPath("$[0].content").value("정말 친절한 물품 주인이에요."))
                .andExpect(jsonPath("$[0].item_title").value("공개 후기 물품"))
                .andExpect(jsonPath("$[0].reviewer_name").value("공개 후기 신청자"))
                .andExpect(jsonPath("$[0].reviewee_role").value("LENDER"));
        mockMvc.perform(get("/api/v1/users/{userId}/profile", fixture.lender().getId())
                        .with(jwt().jwt(token -> token.subject(fixture.borrower().getId().toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rating").value(5.0))
                .andExpect(jsonPath("$.review_count").value(1));
        mockMvc.perform(get("/api/v1/items/{itemId}", fixture.rental().getItem().getId())
                        .with(jwt().jwt(token -> token.subject(fixture.borrower().getId().toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.owner_rating").value(5.0))
                .andExpect(jsonPath("$.review_count").value(1));
    }

    private TestRental returnedRental(Instant returnedAt) {
        User lender = userRepository.save(new User("공개 후기 주인"));
        User borrower = userRepository.save(new User("공개 후기 신청자"));
        Item item = itemRepository.save(new Item("공개 후기 물품", lender));
        ChatRoom room = chatRoomRepository.save(new ChatRoom(item, borrower, lender));
        Rental rental = new Rental(item, borrower, lender, room,
                LocalDateTime.of(2026, 8, 1, 9, 0),
                LocalDateTime.of(2026, 8, 2, 9, 0), 10_000);
        rental.changeStatus(RentalStatus.RENTING);
        rental.returnItem(returnedAt);
        rentalRepository.save(rental);
        return new TestRental(rental, lender, borrower);
    }

    private record TestRental(Rental rental, User lender, User borrower) {}

    @TestConfiguration
    static class ClockConfig {
        @Bean
        @Primary
        MutableClock publicReviewTestClock() {
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

        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return instant.get(); }
    }
}
