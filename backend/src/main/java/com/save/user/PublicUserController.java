package com.save.user;

import com.save.item.ItemResponse;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class PublicUserController {
    private final UserService userService;

    public PublicUserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/{userId:\\d+}/profile")
    public PublicUserProfileResponse profile(@PathVariable Integer userId) {
        return userService.getPublicProfile(userId);
    }

    @GetMapping("/{userId:\\d+}/items")
    public List<ItemResponse> items(@PathVariable Integer userId,
                                    @AuthenticationPrincipal Jwt jwt) {
        return userService.getPublicItems(userId, viewerId(jwt));
    }

    private Integer viewerId(Jwt jwt) {
        return jwt == null ? null : Integer.valueOf(jwt.getSubject());
    }
}
