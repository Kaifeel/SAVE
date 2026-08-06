package com.save.item;

import java.time.Instant;
import java.util.List;

public record ItemResponse(
        Integer id,
        Integer ownerId,
        String ownerName,
        Integer ownerUniversityId,
        String ownerUniversityName,
        String type,
        String title,
        Integer rentalFee,
        String rentalUnit,
        Integer pickupLocationId,
        String pickupLocationName,
        String description,
        String precautions,
        String status,
        String mainImageUrl,
        List<String> imageUrls,
        Integer viewCount,
        long wishlistCount,
        boolean wishlisted,
        Instant createdAt,
        Instant updatedAt) {

    public static ItemResponse from(Item item, boolean wishlisted, long wishlistCount) {
        List<String> images = item.getPhotoUrls();
        Integer universityId = item.getOwner().getUniversity() == null
                ? null : item.getOwner().getUniversity().getId();
        String universityName = item.getOwner().getUniversity() == null
                ? null : item.getOwner().getUniversity().getName();
        Integer pickupLocationId = item.getPickupLocation() == null
                ? null : item.getPickupLocation().getId();
        String pickupLocationName = item.getPickupLocation() == null
                ? null : item.getPickupLocation().getName();
        return new ItemResponse(item.getId(), item.getOwner().getId(), item.getOwner().getName(),
                universityId, universityName, item.getType(), item.getTitle(),
                item.getRentalFee(), item.getRentalUnit().name(),
                pickupLocationId, pickupLocationName, item.getDescription(),
                item.getPrecautions(), item.getStatus().name(),
                images.isEmpty() ? null : images.get(0), images, item.getViewCount(), wishlistCount,
                wishlisted, item.getCreatedAt(), item.getUpdatedAt());
    }
}
