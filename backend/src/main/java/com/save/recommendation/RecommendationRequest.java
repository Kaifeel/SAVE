package com.save.recommendation;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record RecommendationRequest(@Size(max = 100) String university,
                                    @Size(max = 100) String weather,
                                    @Size(max = 500) String situation,
                                    @Min(1) @Max(20) Integer limit) {}
