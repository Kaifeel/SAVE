package com.save.rental;

import java.time.LocalDateTime;

public record RentalResponse(Integer id, Integer itemId, Integer borrowerId,
                             Integer lenderId, Integer chatRoomId, String status,
                             LocalDateTime startDate, LocalDateTime endDate,
                             Integer totalPrice, LocalDateTime createdAt,
                             LocalDateTime updatedAt) {
    public static RentalResponse from(Rental rental) {
        return new RentalResponse(rental.getId(), rental.getItem().getId(),
                rental.getBorrower().getId(), rental.getLender().getId(),
                rental.getChatRoom().getId(), rental.getStatus().name(), rental.getStartDate(),
                rental.getEndDate(), rental.getTotalPrice(), rental.getCreatedAt(), rental.getUpdatedAt());
    }
}
