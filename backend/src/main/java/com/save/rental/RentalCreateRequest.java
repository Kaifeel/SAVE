package com.save.rental;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public record RentalCreateRequest(@NotNull Integer itemId,
                                  @NotNull Integer chatRoomId,
                                  @NotNull LocalDateTime startDate,
                                  @NotNull LocalDateTime endDate,
                                  @NotNull @Min(0) Integer totalPrice) {}
