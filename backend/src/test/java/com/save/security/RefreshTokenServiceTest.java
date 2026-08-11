package com.save.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.save.common.BusinessException;
import com.save.user.User;
import com.save.user.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HexFormat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

@DataJpaTest
class RefreshTokenServiceTest {

    private static final Instant NOW = Instant.parse("2026-08-11T02:00:00Z");
    private static final Duration LIFETIME = Duration.ofDays(14);

    @Autowired RefreshTokenRepository refreshTokenRepository;
    @Autowired UserRepository userRepository;

    private RefreshTokenService service;
    private User user;

    @BeforeEach
    void setUp() {
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
        user = userRepository.save(new User("리프레시 사용자"));
        service = new RefreshTokenService(
                refreshTokenRepository,
                Clock.fixed(NOW, ZoneOffset.UTC),
                LIFETIME);
    }

    @Test
    void issueStoresOnlyHashAndRotationKeepsAbsoluteExpiry() {
        IssuedRefreshToken issued = service.issue(user);

        assertThat(issued.rawToken()).isNotBlank();
        RefreshToken stored = refreshTokenRepository.findByTokenHash(hash(issued.rawToken()))
                .orElseThrow();
        assertThat(stored.getTokenHash()).doesNotContain(issued.rawToken());
        assertThat(stored.getExpiresAt()).isEqualTo(NOW.plus(LIFETIME));

        RotatedRefreshToken rotated = service.rotate(issued.rawToken());

        assertThat(rotated.user().getId()).isEqualTo(user.getId());
        assertThat(rotated.rawToken()).isNotEqualTo(issued.rawToken());
        assertThat(rotated.expiresAt()).isEqualTo(issued.expiresAt());
        assertThat(stored.getConsumedAt()).isEqualTo(NOW);
        assertThat(refreshTokenRepository.findByTokenHash(hash(rotated.rawToken())))
                .get().extracting(RefreshToken::getFamilyId)
                .isEqualTo(stored.getFamilyId());
    }

    @Test
    void replayRevokesEveryTokenInTheFamily() {
        IssuedRefreshToken issued = service.issue(user);
        RotatedRefreshToken rotated = service.rotate(issued.rawToken());

        assertThatThrownBy(() -> service.rotate(issued.rawToken()))
                .isInstanceOf(BusinessException.class)
                .hasMessage("다시 로그인해주세요.");

        RefreshToken replacement = refreshTokenRepository.findByTokenHash(
                hash(rotated.rawToken())).orElseThrow();
        assertThat(replacement.getRevokedAt()).isEqualTo(NOW);
        assertThatThrownBy(() -> service.rotate(rotated.rawToken()))
                .isInstanceOf(BusinessException.class)
                .hasMessage("다시 로그인해주세요.");
    }

    @Test
    void expiredTokenCannotBeRotated() {
        IssuedRefreshToken issued = service.issue(user);
        RefreshTokenService afterExpiry = new RefreshTokenService(
                refreshTokenRepository,
                Clock.fixed(NOW.plus(LIFETIME).plusSeconds(1), ZoneOffset.UTC),
                LIFETIME);

        assertThatThrownBy(() -> afterExpiry.rotate(issued.rawToken()))
                .isInstanceOf(BusinessException.class)
                .hasMessage("로그인 세션이 만료되었습니다.");
    }

    @Test
    void revokeFamilyInvalidatesTheActiveToken() {
        IssuedRefreshToken issued = service.issue(user);

        service.revokeFamily(issued.rawToken());

        RefreshToken stored = refreshTokenRepository.findByTokenHash(hash(issued.rawToken()))
                .orElseThrow();
        assertThat(stored.getRevokedAt()).isEqualTo(NOW);
        assertThatThrownBy(() -> service.rotate(issued.rawToken()))
                .isInstanceOf(BusinessException.class)
                .hasMessage("다시 로그인해주세요.");
    }

    private String hash(String rawToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception exception) {
            throw new AssertionError(exception);
        }
    }
}
