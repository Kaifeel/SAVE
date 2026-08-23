package com.save.security;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("prod")
public class ProductionSecretsValidator {
    static final String DEVELOPMENT_SECRET =
            "save-local-development-jwt-secret-change-me-2026";

    private final String jwtSecret;
    private final boolean refreshCookieSecure;

    public ProductionSecretsValidator(
            @Value("${security.jwt.secret}") String jwtSecret,
            @Value("${security.refresh-token.cookie-secure:false}") boolean refreshCookieSecure) {
        this.jwtSecret = jwtSecret;
        this.refreshCookieSecure = refreshCookieSecure;
    }

    @PostConstruct
    void validateAtStartup() {
        validate(jwtSecret, refreshCookieSecure);
    }

    public static void validate(String secret) {
        validate(secret, true);
    }

    public static void validate(String secret, boolean refreshCookieSecure) {
        if (secret == null || secret.length() < 32 || DEVELOPMENT_SECRET.equals(secret)) {
            throw new IllegalStateException(
                    "운영 환경에는 32자 이상의 무작위 JWT_SECRET이 필요합니다.");
        }
        if (!refreshCookieSecure) {
            throw new IllegalStateException(
                    "운영 환경에서는 refresh cookie Secure 설정이 필요합니다.");
        }
    }
}
