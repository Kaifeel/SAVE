package com.save.item;

import java.time.LocalDateTime;
import java.util.List;

public record ItemResponse(
        Integer id,
        Integer userId,
        String ownerName,
        String type,
        String title,
        Integer price,
        String priceUnit,
        String pickupLocation,
        String university,
        String description,
        String precautions,
        String status,
        String mainImageUrl,
        List<String> imageUrls,
        Integer viewCount,
        long wishlistCount,
        boolean wishlisted,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {

    public static ItemResponse from(Item item, boolean wishlisted, long wishlistCount) {
        List<String> images = item.getPhotoUrls();
        return new ItemResponse(item.getId(), item.getUser().getId(), item.getUser().getName(),
                item.getType(), item.getTitle(), item.getPrice(), item.getPriceUnit(),
                item.getPickupLocation(), item.getUniversity(), item.getDescription(),
                item.getPrecautions(), item.getStatus().name(),
                images.isEmpty() ? null : images.get(0), images, item.getViewCount(), wishlistCount,
                wishlisted, item.getCreatedAt(), item.getUpdatedAt());
    }
}
