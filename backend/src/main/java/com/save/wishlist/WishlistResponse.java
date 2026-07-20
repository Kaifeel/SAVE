package com.save.wishlist;

import java.time.LocalDateTime;

public record WishlistResponse(Integer wishlistId, Integer itemId, Integer userId,
                               LocalDateTime createdAt) {
    public static WishlistResponse from(Wishlist wishlist) {
        return new WishlistResponse(wishlist.getId(), wishlist.getItem().getId(),
                wishlist.getUser().getId(), wishlist.getCreatedAt());
    }
}
