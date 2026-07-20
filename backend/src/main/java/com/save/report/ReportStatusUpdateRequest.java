package com.save.report;

import jakarta.validation.constraints.NotBlank;

public record ReportStatusUpdateRequest(@NotBlank String status) {}
