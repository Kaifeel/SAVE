package com.save.wishlist;

import com.save.common.BusinessException;
import com.save.item.Item;
import com.save.item.ItemRepository;
import com.save.item.ItemStatus;
import com.save.user.User;
import com.save.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WishlistService {
    private final WishlistRepository wishlistRepository;
    private final UserRepository userRepository;
    private final ItemRepository itemRepository;

    public WishlistService(WishlistRepository wishlistRepository, UserRepository userRepository,
                           ItemRepository itemRepository) {
        this.wishlistRepository = wishlistRepository;
        this.userRepository = userRepository;
        this.itemRepository = itemRepository;
    }

    @Transactional
    public void add(Integer userId, Integer itemId) {
        if (wishlistRepository.existsByUserIdAndItemId(userId, itemId)) return;
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "사용자가 존재하지 않습니다."));
        Item item = itemRepository.findById(itemId)
                .filter(value -> value.getStatus() != ItemStatus.DELETED)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "물품이 존재하지 않습니다."));
        if (item.getUser().getId().equals(userId)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "본인 물품은 찜할 수 없습니다.");
        }
        wishlistRepository.save(new Wishlist(user, item));
    }

    @Transactional
    public void remove(Integer userId, Integer itemId) {
        wishlistRepository.findByUserIdAndItemId(userId, itemId).ifPresent(wishlistRepository::delete);
    }
}
