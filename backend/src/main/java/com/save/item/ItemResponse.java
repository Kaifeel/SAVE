package com.save.item;

import java.time.LocalDateTime;
import java.util.List;

public record ItemResponse(
        Integer id,
        String title,
        Integer price,
        String priceType,
        String location,
        String type,
        String university,
        String status,
        Integer ownerId,
        String ownerName,
        String description,
        String precautions,
        Integer viewCount,
        List<String> photos,
        boolean wishlisted,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {

    public static ItemResponse from(Item item, boolean wishlisted) {
        return new ItemResponse(item.getId(), item.getTitle(), item.getPrice(),
                item.getPriceUnit(), item.getPickupLocation(), item.getType(),
                item.getUniversity(), item.getStatus().name().toLowerCase(),
                item.getUser().getId(), item.getUser().getName(), item.getDescription(),
                item.getPrecautions(), item.getViewCount(), item.getPhotoUrls(), wishlisted,
                item.getCreatedAt(), item.getUpdatedAt());
    }
}
