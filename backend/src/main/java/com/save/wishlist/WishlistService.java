package com.save.wishlist;

import com.save.common.BusinessException;
import com.save.item.Item;
import com.save.item.ItemRepository;
import com.save.item.ItemStatus;
import com.save.user.User;
import com.save.user.UserRepository;
import com.save.security.CampusAccessPolicy;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WishlistService {
    private final WishlistRepository wishlistRepository;
    private final UserRepository userRepository;
    private final ItemRepository itemRepository;
    private final CampusAccessPolicy campusAccessPolicy;

    public WishlistService(WishlistRepository wishlistRepository, UserRepository userRepository,
                           ItemRepository itemRepository, CampusAccessPolicy campusAccessPolicy) {
        this.wishlistRepository = wishlistRepository;
        this.userRepository = userRepository;
        this.itemRepository = itemRepository;
        this.campusAccessPolicy = campusAccessPolicy;
    }

    @Transactional
    public WishlistResponse add(Integer userId, Integer itemId) {
        var existing = wishlistRepository.findByUserIdAndItemId(userId, itemId);
        if (existing.isPresent()) return WishlistResponse.from(existing.get());
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "사용자가 존재하지 않습니다."));
        Item item = itemRepository.findById(itemId)
                .filter(value -> value.getStatus() != ItemStatus.DELETED)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "물품이 존재하지 않습니다."));
        if (item.getOwner().getId().equals(userId)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "본인 물품은 찜할 수 없습니다.");
        }
        campusAccessPolicy.requireSameCampus(user, item);
        return WishlistResponse.from(wishlistRepository.save(new Wishlist(user, item)));
    }

    @Transactional
    public void remove(Integer userId, Integer itemId) {
        wishlistRepository.findByUserIdAndItemId(userId, itemId).ifPresent(wishlistRepository::delete);
    }
}
