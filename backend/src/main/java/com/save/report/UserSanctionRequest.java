package com.save.report;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UserSanctionRequest(@NotBlank @Size(max = 500) String reason,
                                  @NotBlank @Pattern(regexp = "SUSPENDED") String status) {}
