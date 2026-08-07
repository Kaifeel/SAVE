package com.save.review;

import java.time.Instant;

public record ReviewWorkflow(ReviewState state, Instant deadline) {
    public static ReviewWorkflow notAvailable() {
        return new ReviewWorkflow(ReviewState.NOT_AVAILABLE, null);
    }
}
