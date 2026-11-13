package com.save.item;

import com.save.review.ReviewSummary;
import com.save.storage.ObjectStorage;
import com.save.storage.StoredObject;
import com.save.storage.UploadPolicy;
import com.save.storage.ValidatedImage;
import com.save.user.User;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ItemResponseMapperTest {

    @Test
    void resolvesEveryStoredPhotoAndUsesTheFirstAsMainImage() {
        ObjectStorage storage = mock(ObjectStorage.class);
        when(storage.readUrl("stored-one")).thenReturn("signed-one");
        when(storage.readUrl("stored-two")).thenReturn("signed-two");
        PhotoStorageService photos = new PhotoStorageService(mock(UploadPolicy.class), storage);
        ItemResponseMapper mapper = new ItemResponseMapper(photos);
        Item item = itemWithPhotos(List.of("stored-one", "stored-two"));

        ItemResponse response = mapper.from(item, false, 0, ReviewSummary.empty());

        assertThat(response.imageUrls()).containsExactly("signed-one", "signed-two");
        assertThat(response.mainImageUrl()).isEqualTo("signed-one");
    }

    @Test
    void keepsAnEmptyPhotoListEmpty() {
        PhotoStorageService photos = new PhotoStorageService(
                mock(UploadPolicy.class), passthroughStorage());
        ItemResponseMapper mapper = new ItemResponseMapper(photos);

        ItemResponse response = mapper.from(
                itemWithPhotos(List.of()), false, 0, ReviewSummary.empty());

        assertThat(response.imageUrls()).isEmpty();
        assertThat(response.mainImageUrl()).isNull();
    }

    private Item itemWithPhotos(List<String> photoUrls) {
        Item item = mock(Item.class);
        User owner = mock(User.class);
        when(item.getId()).thenReturn(7);
        when(item.getOwner()).thenReturn(owner);
        when(owner.getId()).thenReturn(3);
        when(owner.getName()).thenReturn("owner");
        when(item.getType()).thenReturn("LEND");
        when(item.getTitle()).thenReturn("tripod");
        when(item.getRentalFee()).thenReturn(1000);
        when(item.getRentalUnit()).thenReturn(RentalUnit.DAY);
        when(item.getStatus()).thenReturn(ItemStatus.AVAILABLE);
        when(item.getPhotoUrls()).thenReturn(photoUrls);
        return item;
    }

    private ObjectStorage passthroughStorage() {
        return new ObjectStorage() {
            @Override
            public StoredObject store(ValidatedImage image) {
                throw new UnsupportedOperationException();
            }

            @Override
            public StoredObject storeProfile(ValidatedImage image) {
                throw new UnsupportedOperationException();
            }
        };
    }
}
