package com.save.security;

import jakarta.validation.constraints.NotBlank;

public record MobileRefreshRequest(@NotBlank String refreshToken) {}
