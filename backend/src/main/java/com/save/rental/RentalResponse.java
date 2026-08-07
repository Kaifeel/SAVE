package com.save.rental;

import com.save.review.ReviewState;
import com.save.review.ReviewWorkflow;
import java.time.Instant;
import java.time.LocalDateTime;

public record RentalResponse(Integer id, Integer itemId, Integer borrowerId,
                             Integer lenderId, Integer chatRoomId, String status,
                             LocalDateTime startDate, LocalDateTime endDate,
                             Integer totalPrice, LocalDateTime createdAt,
                             LocalDateTime updatedAt, Instant returnedAt,
                             Instant reviewDeadline, ReviewState reviewState) {
    public static RentalResponse from(Rental rental, ReviewWorkflow workflow) {
        return new RentalResponse(rental.getId(), rental.getItem().getId(),
                rental.getBorrower().getId(), rental.getLender().getId(),
                rental.getChatRoom().getId(), rental.getStatus().name(), rental.getStartDate(),
                rental.getEndDate(), rental.getTotalPrice(), rental.getCreatedAt(), rental.getUpdatedAt(),
                rental.getReturnedAt(), workflow.deadline(), workflow.state());
    }
}
