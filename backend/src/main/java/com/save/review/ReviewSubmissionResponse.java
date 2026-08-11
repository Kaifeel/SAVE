package com.save.review;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ReviewSubmissionResponse(
        ReviewState reviewState,
        Instant reviewDeadline,
        ReviewResponse review) {}
