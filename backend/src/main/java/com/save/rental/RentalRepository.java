package com.save.rental;

import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RentalRepository extends JpaRepository<Rental, Integer> {
    List<Rental> findByBorrowerIdOrLenderIdOrderByCreatedAtDesc(Integer borrowerId, Integer lenderId);
    boolean existsByItemIdAndStatusIn(Integer itemId, List<RentalStatus> statuses);
    long countByLenderIdAndStatus(Integer lenderId, RentalStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Rental r where r.id = :rentalId")
    Optional<Rental> findByIdForUpdate(@Param("rentalId") Integer rentalId);
}
