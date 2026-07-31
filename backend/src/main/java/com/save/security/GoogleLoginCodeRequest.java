package com.save.security;

import jakarta.validation.constraints.NotBlank;

public record GoogleLoginCodeRequest(@NotBlank String code) {}
