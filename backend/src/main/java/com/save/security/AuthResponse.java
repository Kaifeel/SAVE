package com.save.security;

public record AuthResponse(String accessToken, String tokenType, boolean isNewUser,
                           AuthUserResponse user) {}
