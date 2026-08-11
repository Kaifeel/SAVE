package com.save.security;

import com.save.user.User;
import java.time.Instant;

public record RotatedRefreshToken(User user, String rawToken, Instant expiresAt) {}
