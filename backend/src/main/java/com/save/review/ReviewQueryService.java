package com.save.review;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReviewQueryService {
    private final ReviewRepository reviewRepository;
    private final Clock clock;

    public ReviewQueryService(ReviewRepository reviewRepository, Clock clock) {
        this.reviewRepository = reviewRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<PublicReviewResponse> visibleReviews(Integer userId) {
        return visibleEntities(userId).stream().map(PublicReviewResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public ReviewSummary summary(Integer userId) {
        List<Review> reviews = visibleEntities(userId);
        if (reviews.isEmpty()) return ReviewSummary.empty();
        double average = reviews.stream().mapToInt(Review::getRating).average().orElse(0.0);
        return new ReviewSummary(average, reviews.size());
    }

    private List<Review> visibleEntities(Integer userId) {
        Instant deadlineCutoff = clock.instant().minus(
                ReviewPolicy.SUBMISSION_DEADLINE_DAYS, ChronoUnit.DAYS);
        return reviewRepository.findVisibleByRevieweeId(userId, deadlineCutoff);
    }
}
