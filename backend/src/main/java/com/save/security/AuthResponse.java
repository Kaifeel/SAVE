package com.save.security;

public record AuthResponse(String accessToken, String tokenType, long expiresIn,
                           AuthUserResponse user) {}
