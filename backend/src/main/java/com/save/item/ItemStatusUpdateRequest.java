package com.save.item;

import jakarta.validation.constraints.NotBlank;

public record ItemStatusUpdateRequest(@NotBlank String status) {}
