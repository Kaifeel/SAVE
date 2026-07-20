package com.save.rental;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record RentalResponse(Integer id, Integer itemId, String itemTitle,
                             Integer borrowerId, String borrowerName,
                             Integer lenderId, String lenderName,
                             LocalDate startDate, LocalDate endDate, String message,
                             String status, LocalDateTime createdAt, LocalDateTime updatedAt) {
    public static RentalResponse from(Rental rental) {
        return new RentalResponse(rental.getId(), rental.getItem().getId(), rental.getItem().getTitle(),
                rental.getBorrower().getId(), rental.getBorrower().getName(),
                rental.getLender().getId(), rental.getLender().getName(), rental.getStartDate(),
                rental.getEndDate(), rental.getMessage(), rental.getStatus().name().toLowerCase(),
                rental.getCreatedAt(), rental.getUpdatedAt());
    }
}
