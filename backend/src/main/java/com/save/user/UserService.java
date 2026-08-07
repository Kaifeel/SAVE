package com.save.user;

import com.save.common.BusinessException;
import com.save.item.ItemRepository;
import com.save.item.ItemResponse;
import com.save.item.ItemStatus;
import com.save.rental.RentalRepository;
import com.save.rental.RentalStatus;
import com.save.review.PublicReviewResponse;
import com.save.review.ReviewQueryService;
import com.save.wishlist.WishlistRepository;
import com.save.university.University;
import com.save.university.UniversityRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final ItemRepository itemRepository;
    private final WishlistRepository wishlistRepository;
    private final UniversityRepository universityRepository;
    private final RentalRepository rentalRepository;
    private final ReviewQueryService reviewQueryService;

    public UserService(UserRepository userRepository, ItemRepository itemRepository,
                       WishlistRepository wishlistRepository,
                       UniversityRepository universityRepository,
                       RentalRepository rentalRepository,
                       ReviewQueryService reviewQueryService) {
        this.userRepository = userRepository;
        this.itemRepository = itemRepository;
        this.wishlistRepository = wishlistRepository;
        this.universityRepository = universityRepository;
        this.rentalRepository = rentalRepository;
        this.reviewQueryService = reviewQueryService;
    }

    @Transactional(readOnly = true)
    public UserResponse getMe(Integer userId) { return UserResponse.from(findUser(userId)); }

    @Transactional
    public UserResponse updateProfile(Integer userId, UserProfileUpdateRequest request) {
        User user = findUser(userId);
        University university = request.universityId() == null ? null
                : universityRepository.findById(request.universityId())
                .orElseThrow(() -> new BusinessException(HttpStatus.BAD_REQUEST,
                        "등록되지 않은 대학입니다."));
        user.updateProfile(request.name(), request.department(), university,
                request.profileImageUrl());
        return UserResponse.from(user);
    }

    @Transactional(readOnly = true)
    public List<ItemResponse> getMyItems(Integer userId) {
        findUser(userId);
        return itemRepository.findByOwnerIdAndStatusNotOrderByCreatedAtDesc(
                        userId, ItemStatus.DELETED)
                .stream().map(item -> ItemResponse.from(item, false,
                        wishlistRepository.countByItemId(item.getId()))).toList();
    }

    @Transactional(readOnly = true)
    public List<ItemResponse> getMyWishlist(Integer userId) {
        findUser(userId);
        return wishlistRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(wishlist -> ItemResponse.from(wishlist.getItem(), true,
                        wishlistRepository.countByItemId(wishlist.getItem().getId()))).toList();
    }

    @Transactional(readOnly = true)
    public PublicUserProfileResponse getPublicProfile(Integer userId) {
        User user = findUser(userId);
        long completedTradeCount = rentalRepository.countByLenderIdAndStatus(
                userId, RentalStatus.RETURNED);
        return PublicUserProfileResponse.from(user, completedTradeCount,
                reviewQueryService.summary(userId));
    }

    @Transactional(readOnly = true)
    public List<PublicReviewResponse> getPublicReviews(Integer userId) {
        findUser(userId);
        return reviewQueryService.visibleReviews(userId);
    }

    @Transactional(readOnly = true)
    public List<ItemResponse> getPublicItems(Integer userId, Integer viewerId) {
        findUser(userId);
        return itemRepository.findByOwnerIdAndStatusNotOrderByCreatedAtDesc(
                        userId, ItemStatus.DELETED)
                .stream()
                .map(item -> ItemResponse.from(
                        item,
                        viewerId != null && wishlistRepository.existsByUserIdAndItemId(
                                viewerId, item.getId()),
                        wishlistRepository.countByItemId(item.getId())))
                .toList();
    }

    private User findUser(Integer id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "사용자가 존재하지 않습니다."));
    }
}
