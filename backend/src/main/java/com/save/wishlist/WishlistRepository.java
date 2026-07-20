package com.save.wishlist;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WishlistRepository extends JpaRepository<Wishlist, Integer> {
    boolean existsByUserIdAndItemId(Integer userId, Integer itemId);
    Optional<Wishlist> findByUserIdAndItemId(Integer userId, Integer itemId);
    List<Wishlist> findByUserIdOrderByCreatedAtDesc(Integer userId);
    long countByItemId(Integer itemId);
}
