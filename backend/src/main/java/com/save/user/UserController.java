package com.save.user;

import com.save.item.ItemResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users/me")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) { this.userService = userService; }

    @GetMapping
    public UserResponse me(@AuthenticationPrincipal Jwt jwt) {
        return userService.getMe(userId(jwt));
    }

    @PutMapping("/profile")
    public UserResponse updateProfile(@AuthenticationPrincipal Jwt jwt,
                                      @Valid @RequestBody UserProfileUpdateRequest request) {
        return userService.updateProfile(userId(jwt), request);
    }

    @GetMapping("/items")
    public List<ItemResponse> myItems(@AuthenticationPrincipal Jwt jwt) {
        return userService.getMyItems(userId(jwt));
    }

    @GetMapping("/wishlist")
    public List<ItemResponse> wishlist(@AuthenticationPrincipal Jwt jwt) {
        return userService.getMyWishlist(userId(jwt));
    }

    private Integer userId(Jwt jwt) { return Integer.valueOf(jwt.getSubject()); }
}
