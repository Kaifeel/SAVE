package com.save.rental;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RentalRepository extends JpaRepository<Rental, Integer> {
    List<Rental> findByBorrowerIdOrLenderIdOrderByCreatedAtDesc(Integer borrowerId, Integer lenderId);
    boolean existsByItemIdAndStatusIn(Integer itemId, List<RentalStatus> statuses);
}
