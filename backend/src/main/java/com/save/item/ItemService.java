package com.save.item;

import com.save.common.BusinessException;
import com.save.user.User;
import com.save.user.UserRepository;
import com.save.wishlist.WishlistRepository;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ItemService {
    private final ItemRepository itemRepository;
    private final UserRepository userRepository;
    private final WishlistRepository wishlistRepository;
    private final PhotoStorageService photoStorageService;

    public ItemService(ItemRepository itemRepository, UserRepository userRepository,
                       WishlistRepository wishlistRepository, PhotoStorageService photoStorageService) {
        this.itemRepository = itemRepository;
        this.userRepository = userRepository;
        this.wishlistRepository = wishlistRepository;
        this.photoStorageService = photoStorageService;
    }

    @Transactional(readOnly = true)
    public List<ItemResponse> list(String university, Integer userId) {
        List<Item> items = university == null || university.isBlank()
                ? itemRepository.findByStatusNotOrderByCreatedAtDesc(ItemStatus.DELETED)
                : itemRepository.findByUniversityAndStatusNotOrderByCreatedAtDesc(university.trim(), ItemStatus.DELETED);
        return items.stream().map(item -> response(item, userId)).toList();
    }

    @Transactional
    public ItemResponse detail(Integer itemId, Integer userId) {
        Item item = findVisible(itemId);
        item.increaseViewCount();
        return response(item, userId);
    }

    @Transactional
    public ItemResponse create(Integer userId, ItemUpsertRequest request) {
        validate(request);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "사용자가 존재하지 않습니다."));
        List<String> photoUrls = photoStorageService.store(request.getPhotos());
        Item item = new Item(user, normalizeType(request.getType()), request.getTitle().trim(),
                request.getPrice(), normalizePriceType(request.getPriceType()), trimToNull(request.getLocation()),
                defaultUniversity(request.getUniversity()), trimToNull(request.getDescription()),
                trimToNull(request.getPrecautions()), photoUrls);
        return response(itemRepository.save(item), userId);
    }

    @Transactional
    public ItemResponse update(Integer itemId, Integer userId, ItemUpsertRequest request) {
        validate(request);
        Item item = findOwned(itemId, userId);
        List<String> photoUrls = photoStorageService.store(request.getPhotos());
        item.update(normalizeType(request.getType()), request.getTitle().trim(), request.getPrice(),
                normalizePriceType(request.getPriceType()), trimToNull(request.getLocation()),
                defaultUniversity(request.getUniversity()), trimToNull(request.getDescription()),
                trimToNull(request.getPrecautions()), photoUrls);
        return response(item, userId);
    }

    @Transactional
    public ItemResponse changeStatus(Integer itemId, Integer userId, String rawStatus) {
        Item item = findOwned(itemId, userId);
        try {
            ItemStatus status = ItemStatus.valueOf(rawStatus.trim().toUpperCase(Locale.ROOT));
            if (status == ItemStatus.DELETED) {
                throw new IllegalArgumentException();
            }
            item.changeStatus(status);
            return response(item, userId);
        } catch (IllegalArgumentException exception) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "지원하지 않는 물품 상태입니다.");
        }
    }

    @Transactional
    public void delete(Integer itemId, Integer userId) { findOwned(itemId, userId).markDeleted(); }

    private ItemResponse response(Item item, Integer userId) {
        boolean wishlisted = userId != null && wishlistRepository.existsByUserIdAndItemId(userId, item.getId());
        return ItemResponse.from(item, wishlisted);
    }

    private Item findVisible(Integer id) {
        Item item = itemRepository.findById(id)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "물품이 존재하지 않습니다."));
        if (item.getStatus() == ItemStatus.DELETED) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "물품이 존재하지 않습니다.");
        }
        return item;
    }

    private Item findOwned(Integer id, Integer userId) {
        Item item = findVisible(id);
        if (!item.getUser().getId().equals(userId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "물품을 수정할 권한이 없습니다.");
        }
        return item;
    }

    private void validate(ItemUpsertRequest request) {
        if (request.getTitle() == null || request.getTitle().isBlank() || request.getTitle().length() > 100) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "물품명은 1자 이상 100자 이하여야 합니다.");
        }
        if (request.getPrice() == null || request.getPrice() < 0) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "가격은 0 이상의 숫자여야 합니다.");
        }
    }

    private String normalizeType(String type) {
        if (type == null) return "rent";
        String normalized = type.trim().toLowerCase(Locale.ROOT);
        if (normalized.equals("rent") || normalized.equals("lend")) return "rent";
        if (normalized.equals("want") || normalized.equals("request") || normalized.equals("borrow")) return "want";
        throw new BusinessException(HttpStatus.BAD_REQUEST, "지원하지 않는 게시글 유형입니다.");
    }

    private String normalizePriceType(String priceType) {
        return priceType == null || priceType.isBlank() ? "일" : priceType.trim();
    }

    private String defaultUniversity(String university) {
        return university == null || university.isBlank() ? "부경대학교" : university.trim();
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
