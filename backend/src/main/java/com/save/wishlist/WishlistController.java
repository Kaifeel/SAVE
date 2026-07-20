package com.save.wishlist;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/items/{itemId}/wishlist")
public class WishlistController {
    private final WishlistService wishlistService;

    public WishlistController(WishlistService wishlistService) { this.wishlistService = wishlistService; }

    @PostMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void add(@PathVariable Integer itemId, @AuthenticationPrincipal Jwt jwt) {
        wishlistService.add(userId(jwt), itemId);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable Integer itemId, @AuthenticationPrincipal Jwt jwt) {
        wishlistService.remove(userId(jwt), itemId);
    }

    private Integer userId(Jwt jwt) { return Integer.valueOf(jwt.getSubject()); }
}
