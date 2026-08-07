package com.save.review;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewRepository extends JpaRepository<Review, Integer> {
    boolean existsByRentalIdAndReviewerId(Integer rentalId, Integer reviewerId);
    long countByRentalId(Integer rentalId);
    Optional<Review> findByRentalIdAndReviewerId(Integer rentalId, Integer reviewerId);
}
