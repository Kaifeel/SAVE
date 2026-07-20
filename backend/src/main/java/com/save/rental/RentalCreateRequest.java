package com.save.rental;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record RentalCreateRequest(@NotNull Integer itemId, LocalDate startDate,
                                  LocalDate endDate, @Size(max = 1000) String message) {}
