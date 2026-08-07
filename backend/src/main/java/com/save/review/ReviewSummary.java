package com.save.review;

public record ReviewSummary(double rating, long reviewCount) {
    public static ReviewSummary empty() {
        return new ReviewSummary(0.0, 0);
    }
}
