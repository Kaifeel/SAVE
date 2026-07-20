package com.save.report;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReportCreateRequest(@NotBlank String targetType, @NotNull Integer targetId,
                                  Integer itemId, @NotBlank @Size(max = 1000) String reason) {}
