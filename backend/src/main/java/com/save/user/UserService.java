package com.save.user;

import com.save.common.BusinessException;
import com.save.item.ItemRepository;
import com.save.item.ItemResponse;
import com.save.item.ItemStatus;
import com.save.wishlist.WishlistRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final ItemRepository itemRepository;
    private final WishlistRepository wishlistRepository;

    public UserService(UserRepository userRepository, ItemRepository itemRepository,
                       WishlistRepository wishlistRepository) {
        this.userRepository = userRepository;
        this.itemRepository = itemRepository;
        this.wishlistRepository = wishlistRepository;
    }

    @Transactional(readOnly = true)
    public UserResponse getMe(Integer userId) { return UserResponse.from(findUser(userId)); }

    @Transactional
    public UserResponse updateProfile(Integer userId, UserProfileUpdateRequest request) {
        User user = findUser(userId);
        user.updateProfile(request.name(), request.department(), request.profileImageUrl());
        return UserResponse.from(user);
    }

    @Transactional(readOnly = true)
    public List<ItemResponse> getMyItems(Integer userId) {
        findUser(userId);
        return itemRepository.findByUserIdAndStatusNotOrderByCreatedAtDesc(userId, ItemStatus.DELETED)
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

    private User findUser(Integer id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "사용자가 존재하지 않습니다."));
    }
}
