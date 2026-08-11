package com.save.security;

import java.time.Instant;

public record AuthSession(AuthResponse response, String refreshToken, Instant expiresAt) {}
