package com.save.report;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserSanctionRequest(@Min(1) Integer days,
                                  @NotBlank @Size(max = 500) String reason) {}
