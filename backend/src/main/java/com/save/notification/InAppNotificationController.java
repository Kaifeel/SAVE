package com.save.notification;

import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
public class InAppNotificationController {
    private final InAppNotificationService service;

    public InAppNotificationController(InAppNotificationService service) {
        this.service = service;
    }

    @GetMapping
    public List<InAppNotificationResponse> mine(@AuthenticationPrincipal Jwt jwt) {
        return service.getMine(userId(jwt));
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(@AuthenticationPrincipal Jwt jwt) {
        return Map.of("count", service.unreadCount(userId(jwt)));
    }

    @PatchMapping("/{notificationId}/read")
    public InAppNotificationResponse markRead(@PathVariable Integer notificationId,
                                              @AuthenticationPrincipal Jwt jwt) {
        return service.markRead(notificationId, userId(jwt));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllRead(@AuthenticationPrincipal Jwt jwt) {
        service.markAllRead(userId(jwt));
        return ResponseEntity.noContent().build();
    }

    private Integer userId(Jwt jwt) { return Integer.valueOf(jwt.getSubject()); }
}
