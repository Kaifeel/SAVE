package com.save.security;

import java.time.Instant;

public record IssuedRefreshToken(String rawToken, Instant expiresAt) {}
