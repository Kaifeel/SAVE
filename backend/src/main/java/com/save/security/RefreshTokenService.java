package com.save.security;

import com.save.common.BusinessException;
import com.save.user.User;
import com.save.user.UserStatus;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RefreshTokenService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private final RefreshTokenRepository repository;
    private final Clock clock;
    private final Duration lifetime;

    @Autowired
    public RefreshTokenService(
            RefreshTokenRepository repository,
            Clock clock,
            @Value("${security.refresh-token.expiration-seconds:1209600}") long expirationSeconds) {
        this(repository, clock, Duration.ofSeconds(expirationSeconds));
    }

    RefreshTokenService(RefreshTokenRepository repository, Clock clock, Duration lifetime) {
        if (lifetime.isZero() || lifetime.isNegative()) {
            throw new IllegalArgumentException("Refresh token lifetime must be positive");
        }
        this.repository = repository;
        this.clock = clock;
        this.lifetime = lifetime;
    }

    @Transactional
    public IssuedRefreshToken issue(User user) {
        requireActive(user);
        Instant now = clock.instant();
        return issue(user, UUID.randomUUID().toString(), now, now.plus(lifetime));
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public RotatedRefreshToken rotate(String rawToken) {
        RefreshToken current = find(rawToken);
        Instant now = clock.instant();

        if (current.isConsumed() || current.isRevoked()) {
            revokeFamily(current.getFamilyId(), now);
            repository.flush();
            throw invalidSession();
        }
        if (current.isExpiredAt(now)) {
            current.revoke(now);
            repository.flush();
            throw new BusinessException(HttpStatus.UNAUTHORIZED, "로그인 세션이 만료되었습니다.");
        }
        if (current.getUser().getStatus() != UserStatus.ACTIVE) {
            revokeFamily(current.getFamilyId(), now);
            repository.flush();
            throw new BusinessException(HttpStatus.FORBIDDEN,
                    "정지된 사용자는 로그인할 수 없습니다.");
        }

        current.consume(now);
        IssuedRefreshToken replacement = issue(
                current.getUser(), current.getFamilyId(), now, current.getExpiresAt());
        return new RotatedRefreshToken(
                current.getUser(), replacement.rawToken(), replacement.expiresAt());
    }

    @Transactional
    public void revokeFamily(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return;
        repository.findByTokenHash(hash(rawToken))
                .ifPresent(token -> revokeFamily(token.getFamilyId(), clock.instant()));
    }

    private IssuedRefreshToken issue(User user, String familyId,
                                     Instant createdAt, Instant expiresAt) {
        String rawToken = randomToken();
        repository.save(new RefreshToken(
                user, hash(rawToken), familyId, createdAt, expiresAt));
        return new IssuedRefreshToken(rawToken, expiresAt);
    }

    private RefreshToken find(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) throw invalidSession();
        return repository.findByTokenHash(hash(rawToken)).orElseThrow(this::invalidSession);
    }

    private void revokeFamily(String familyId, Instant now) {
        repository.findFamilyForUpdate(familyId).forEach(token -> token.revoke(now));
    }

    private String randomToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String rawToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private BusinessException invalidSession() {
        return new BusinessException(HttpStatus.UNAUTHORIZED, "다시 로그인해주세요.");
    }

    private void requireActive(User user) {
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException(HttpStatus.FORBIDDEN,
                    "정지된 사용자는 로그인할 수 없습니다.");
        }
    }
}
