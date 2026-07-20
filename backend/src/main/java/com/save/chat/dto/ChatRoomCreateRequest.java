package com.save.chat.dto;

import jakarta.validation.constraints.NotNull;

public record ChatRoomCreateRequest(@NotNull Integer itemId) {}
