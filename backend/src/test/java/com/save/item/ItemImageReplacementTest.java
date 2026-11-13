package com.save.item;

import static org.assertj.core.api.Assertions.assertThat;

import com.save.user.User;
import java.util.List;
import org.junit.jupiter.api.Test;

class ItemImageReplacementTest {
    @Test
    void addsNewPhotosToAnItemThatHadNoPhotos() {
        Item item = itemWithPhotos(List.of());

        updatePhotos(item, List.of("https://images.example/new.png"));

        assertThat(item.getPhotoUrls()).containsExactly("https://images.example/new.png");
    }

    @Test
    void keepsExistingPhotosWhenNoNewPhotoIsProvided() {
        Item item = itemWithPhotos(List.of("https://images.example/existing.png"));

        updatePhotos(item, List.of());

        assertThat(item.getPhotoUrls()).containsExactly("https://images.example/existing.png");
    }

    @Test
    void replacesExistingPhotosWhenNewPhotosAreProvided() {
        Item item = itemWithPhotos(List.of("https://images.example/old.png"));

        updatePhotos(item, List.of(
            "https://images.example/new-1.png",
            "https://images.example/new-2.png"
        ));

        assertThat(item.getPhotoUrls()).containsExactly(
            "https://images.example/new-1.png",
            "https://images.example/new-2.png"
        );
    }

    private static Item itemWithPhotos(List<String> photoUrls) {
        return new Item(
            new User("사진 테스트 사용자"),
            "LEND",
            "사진 테스트 물품",
            1_000,
            RentalUnit.DAY,
            null,
            "설명",
            "주의사항",
            photoUrls
        );
    }

    private static void updatePhotos(Item item, List<String> photoUrls) {
        item.update(
            "LEND",
            "수정된 물품",
            2_000,
            RentalUnit.DAY,
            null,
            "수정된 설명",
            "수정된 주의사항",
            photoUrls
        );
    }
}
