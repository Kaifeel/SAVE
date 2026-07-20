package com.save.item;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ItemRepository extends JpaRepository<Item, Integer> {
    List<Item> findByStatusNotOrderByCreatedAtDesc(ItemStatus status);
    List<Item> findByUniversityAndStatusNotOrderByCreatedAtDesc(String university, ItemStatus status);
    List<Item> findByUserIdAndStatusNotOrderByCreatedAtDesc(Integer userId, ItemStatus status);
}
