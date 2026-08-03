package com.save.item;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ItemRepository extends JpaRepository<Item, Integer> {
    List<Item> findByStatusNotOrderByCreatedAtDesc(ItemStatus status);
    List<Item> findByOwnerUniversityIdAndStatusNotOrderByCreatedAtDesc(
            Integer universityId, ItemStatus status);
    List<Item> findByOwnerIdAndStatusNotOrderByCreatedAtDesc(Integer ownerId, ItemStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Item i where i.id = :itemId")
    Optional<Item> findByIdForUpdate(@Param("itemId") Integer itemId);
}
