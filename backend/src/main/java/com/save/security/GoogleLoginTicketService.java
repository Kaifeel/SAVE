package com.save.security;

import com.save.common.BusinessException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class GoogleLoginTicketService {
    private static final SecureRandom RANDOM = new SecureRandom();

    private final Map<String, Ticket> tickets = new ConcurrentHashMap<>();
    private final Clock clock;
    private final Duration ttl;

    @Autowired
    public GoogleLoginTicketService(
            @Value("${google.oauth.redirect-ticket-ttl-seconds:60}") long ttlSeconds) {
        this(Clock.systemUTC(), Duration.ofSeconds(ttlSeconds));
    }

    GoogleLoginTicketService(Clock clock, Duration ttl) {
        if (ttl.isZero() || ttl.isNegative()) {
            throw new IllegalArgumentException("Google login ticket TTL must be positive");
        }
        this.clock = clock;
        this.ttl = ttl;
    }

    public String issue(AuthResponse authResponse) {
        removeExpired();
        String code;
        Ticket ticket = new Ticket(authResponse, clock.instant().plus(ttl));
        do {
            byte[] bytes = new byte[32];
            RANDOM.nextBytes(bytes);
            code = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        } while (tickets.putIfAbsent(code, ticket) != null);
        return code;
    }

    public AuthResponse consume(String code) {
        Ticket ticket = code == null ? null : tickets.remove(code);
        if (ticket == null || !ticket.expiresAt().isAfter(clock.instant())) {
            throw new BusinessException(HttpStatus.UNAUTHORIZED,
                    "유효하지 않거나 만료된 Google 로그인 코드입니다.");
        }
        return ticket.authResponse();
    }

    private void removeExpired() {
        Instant now = clock.instant();
        tickets.entrySet().removeIf(entry -> !entry.getValue().expiresAt().isAfter(now));
    }

    private record Ticket(AuthResponse authResponse, Instant expiresAt) {}
}
