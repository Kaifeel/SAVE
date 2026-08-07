package com.save.review;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReviewRepository extends JpaRepository<Review, Integer> {
    boolean existsByRentalIdAndReviewerId(Integer rentalId, Integer reviewerId);
    long countByRentalId(Integer rentalId);
    Optional<Review> findByRentalIdAndReviewerId(Integer rentalId, Integer reviewerId);

    @Query("""
            select review from Review review
            join fetch review.rental rental
            join fetch rental.item item
            join fetch review.reviewer reviewer
            where review.reviewee.id = :revieweeId
              and (rental.returnedAt <= :deadlineCutoff
                or (select count(other) from Review other
                    where other.rental.id = rental.id) = 2)
            order by review.createdAt desc
            """)
    List<Review> findVisibleByRevieweeId(
            @Param("revieweeId") Integer revieweeId,
            @Param("deadlineCutoff") Instant deadlineCutoff);
}
