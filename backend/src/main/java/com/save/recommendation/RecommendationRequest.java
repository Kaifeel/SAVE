package com.save.recommendation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record RecommendationRequest(
        @NotBlank @Size(max = 100) String department,
        @NotEmpty @Size(max = 20) List<@NotBlank @Size(max = 100) String> interestItems,
        @NotBlank @Size(max = 30) String timePeriod,
        @NotNull Boolean isExamPeriod,
        @NotBlank @Size(max = 30) String weatherStatus) {}
