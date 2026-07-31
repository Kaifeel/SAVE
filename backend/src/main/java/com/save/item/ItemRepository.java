package com.save.item;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ItemRepository extends JpaRepository<Item, Integer> {
    List<Item> findByStatusNotOrderByCreatedAtDesc(ItemStatus status);
    List<Item> findByOwnerUniversityIdAndStatusNotOrderByCreatedAtDesc(
            Integer universityId, ItemStatus status);
    List<Item> findByOwnerIdAndStatusNotOrderByCreatedAtDesc(Integer ownerId, ItemStatus status);
}
