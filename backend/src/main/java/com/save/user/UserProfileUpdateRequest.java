package com.save.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserProfileUpdateRequest(
        @NotBlank @Size(max = 50) String name,
        @Size(max = 100) String department,
        @Size(max = 255) String profileImageUrl) {}
