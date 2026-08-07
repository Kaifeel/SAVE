package com.save.rental;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class RentalReturnedAtTest {

    @Test
    void recordsTheExactReturnInstantOnlyOnce() {
        Rental rental = new Rental(null, null, null, null,
                LocalDateTime.of(2026, 8, 1, 9, 0),
                LocalDateTime.of(2026, 8, 2, 9, 0), 10_000);
        rental.changeStatus(RentalStatus.RENTING);
        Instant returnedAt = Instant.parse("2026-08-07T03:00:00Z");

        rental.returnItem(returnedAt);

        assertThat(rental.getStatus()).isEqualTo(RentalStatus.RETURNED);
        assertThat(rental.getReturnedAt()).isEqualTo(returnedAt);
        assertThatThrownBy(() -> rental.returnItem(returnedAt.plusSeconds(1)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("반납 시각은 다시 설정할 수 없습니다.");
        assertThat(rental.getReturnedAt()).isEqualTo(returnedAt);
    }
}
