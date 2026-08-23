package com.save.security;

import java.time.Instant;

public record MobileAuthResponse(
        String accessToken,
        String tokenType,
        boolean isNewUser,
        AuthUserResponse user,
        String refreshToken,
        Instant refreshTokenExpiresAt) {

    static MobileAuthResponse from(AuthSession session) {
        AuthResponse response = session.response();
        return new MobileAuthResponse(response.accessToken(), response.tokenType(),
                response.isNewUser(), response.user(), session.refreshToken(), session.expiresAt());
    }
}
