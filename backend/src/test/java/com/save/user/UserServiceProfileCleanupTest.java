package com.save.user;

import com.save.item.ItemRepository;
import com.save.item.PhotoStorageService;
import com.save.rental.RentalRepository;
import com.save.review.ReviewQueryService;
import com.save.security.CampusAccessPolicy;
import com.save.university.UniversityRepository;
import com.save.wishlist.WishlistRepository;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserServiceProfileCleanupTest {
    @AfterEach
    void clearSynchronization() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void removesNewProfilePhotoWhenTransactionRollsBack() {
        UserRepository users = mock(UserRepository.class);
        PhotoStorageService photos = mock(PhotoStorageService.class);
        User user = User.local("cleanup@pukyong.ac.kr", "hash", "사용자", "컴퓨터공학과");
        when(users.findById(1)).thenReturn(Optional.of(user));
        when(photos.storeProfile(org.mockito.ArgumentMatchers.any()))
                .thenReturn("/uploads/profiles/new.png");
        UserService service = new UserService(users, mock(ItemRepository.class),
                mock(WishlistRepository.class), mock(UniversityRepository.class),
                mock(RentalRepository.class), mock(ReviewQueryService.class),
                mock(CampusAccessPolicy.class), photos);
        TransactionSynchronizationManager.initSynchronization();

        service.editProfile(1, new UserProfileEditRequest("새이름",
                new MockMultipartFile("photo", "new.png", "image/png", new byte[]{1})));
        TransactionSynchronizationManager.getSynchronizations().forEach(
                synchronization -> synchronization.afterCompletion(
                        TransactionSynchronization.STATUS_ROLLED_BACK));

        verify(photos).deleteLocalProfile("/uploads/profiles/new.png");
    }
}
