package com.save.review;

import com.save.common.BusinessException;
import com.save.rental.Rental;
import com.save.rental.RentalRepository;
import com.save.rental.RentalStatus;
import com.save.user.User;
import java.time.Clock;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReviewService {
    private final ReviewRepository reviewRepository;
    private final RentalRepository rentalRepository;
    private final Clock clock;

    public ReviewService(ReviewRepository reviewRepository, RentalRepository rentalRepository,
                         Clock clock) {
        this.reviewRepository = reviewRepository;
        this.rentalRepository = rentalRepository;
        this.clock = clock;
    }

    @Transactional
    public ReviewSubmissionResponse submit(Integer rentalId, Integer reviewerId,
                                           ReviewCreateRequest request) {
        Rental rental = rentalRepository.findByIdForUpdate(rentalId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND,
                        "대여 내역이 존재하지 않습니다."));
        User reviewer = participant(rental, reviewerId);
        User reviewee = rental.getLender().getId().equals(reviewerId)
                ? rental.getBorrower() : rental.getLender();
        if (rental.getStatus() != RentalStatus.RETURNED || rental.getReturnedAt() == null) {
            throw new BusinessException(HttpStatus.CONFLICT,
                    "반납 완료 후에만 후기를 작성할 수 있습니다.");
        }
        Instant deadline = ReviewPolicy.submissionDeadline(rental.getReturnedAt());
        Instant now = clock.instant();
        if (!now.isBefore(deadline)) {
            throw new BusinessException(HttpStatus.CONFLICT, "후기 작성 기간이 종료되었습니다.");
        }
        if (reviewRepository.existsByRentalIdAndReviewerId(rentalId, reviewerId)) {
            throw new BusinessException(HttpStatus.CONFLICT, "이미 후기를 작성했습니다.");
        }
        Review review = reviewRepository.save(new Review(rental, reviewer, reviewee,
                request.rating(), request.content().trim(), now));
        boolean published = reviewRepository.countByRentalId(rentalId) == 2;
        return new ReviewSubmissionResponse(
                published ? ReviewState.PUBLISHED : ReviewState.SUBMITTED_WAITING,
                deadline,
                published ? ReviewResponse.from(review) : null);
    }

    @Transactional(readOnly = true)
    public ReviewWorkflow workflow(Rental rental, Integer userId) {
        if (rental.getStatus() != RentalStatus.RETURNED || rental.getReturnedAt() == null) {
            return ReviewWorkflow.notAvailable();
        }
        Instant deadline = ReviewPolicy.submissionDeadline(rental.getReturnedAt());
        boolean submitted = reviewRepository.existsByRentalIdAndReviewerId(rental.getId(), userId);
        boolean expired = !clock.instant().isBefore(deadline);
        if (expired) {
            return new ReviewWorkflow(
                    submitted ? ReviewState.PUBLISHED : ReviewState.EXPIRED, deadline);
        }
        if (!submitted) return new ReviewWorkflow(ReviewState.AVAILABLE, deadline);
        boolean bothSubmitted = reviewRepository.countByRentalId(rental.getId()) == 2;
        return new ReviewWorkflow(
                bothSubmitted ? ReviewState.PUBLISHED : ReviewState.SUBMITTED_WAITING, deadline);
    }

    private User participant(Rental rental, Integer userId) {
        if (rental.getLender().getId().equals(userId)) return rental.getLender();
        if (rental.getBorrower().getId().equals(userId)) return rental.getBorrower();
        throw new BusinessException(HttpStatus.FORBIDDEN, "대여 후기를 작성할 권한이 없습니다.");
    }
}
