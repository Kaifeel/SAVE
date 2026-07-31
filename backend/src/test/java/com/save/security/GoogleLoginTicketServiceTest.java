package com.save.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.save.common.BusinessException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class GoogleLoginTicketServiceTest {

    @Test
    void ticketCanBeConsumedOnlyOnce() {
        GoogleLoginTicketService service = new GoogleLoginTicketService(
                Clock.fixed(Instant.parse("2026-07-31T00:00:00Z"), ZoneOffset.UTC),
                Duration.ofMinutes(1));
        AuthResponse auth = new AuthResponse("save-jwt", "Bearer", false, null);

        String code = service.issue(auth);

        assertThat(service.consume(code)).isSameAs(auth);
        assertThatThrownBy(() -> service.consume(code))
                .isInstanceOf(BusinessException.class)
                .hasMessage("유효하지 않거나 만료된 Google 로그인 코드입니다.");
    }
}
