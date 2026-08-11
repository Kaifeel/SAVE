package com.save.review;

import java.time.Instant;

public record ReviewResponse(Integer id, Integer rating, String content, Instant createdAt) {
    public static ReviewResponse from(Review review) {
        return new ReviewResponse(review.getId(), review.getRating(),
                review.getContent(), review.getCreatedAt());
    }
}
