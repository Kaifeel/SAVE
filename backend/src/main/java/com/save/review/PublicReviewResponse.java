package com.save.review;

import java.time.Instant;

public record PublicReviewResponse(
        Integer id, Integer rating, String content, Instant createdAt,
        Integer itemId, String itemTitle,
        Integer reviewerId, String reviewerName, String reviewerProfileImageUrl,
        String revieweeRole) {

    public static PublicReviewResponse from(Review review) {
        boolean lenderReview = review.getRental().getLender().getId()
                .equals(review.getReviewee().getId());
        return new PublicReviewResponse(
                review.getId(), review.getRating(), review.getContent(), review.getCreatedAt(),
                review.getRental().getItem().getId(), review.getRental().getItem().getTitle(),
                review.getReviewer().getId(), review.getReviewer().getName(),
                review.getReviewer().getProfileImageUrl(), lenderReview ? "LENDER" : "BORROWER");
    }
}
