package com.save.item;

import com.save.review.ReviewSummary;
import org.springframework.stereotype.Component;

@Component
public class ItemResponseMapper {
    private final PhotoStorageService photoStorageService;

    public ItemResponseMapper(PhotoStorageService photoStorageService) {
        this.photoStorageService = photoStorageService;
    }

    public ItemResponse from(Item item, boolean wishlisted, long wishlistCount,
                             ReviewSummary reviewSummary) {
        return ItemResponse.from(item, wishlisted, wishlistCount, reviewSummary,
                photoStorageService.readUrls(item.getPhotoUrls()));
    }
}
