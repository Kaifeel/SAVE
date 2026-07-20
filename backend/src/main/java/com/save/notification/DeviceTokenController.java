package com.save.notification;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/device-tokens")
public class DeviceTokenController {
    private final DeviceTokenService service;
    public DeviceTokenController(DeviceTokenService service) { this.service = service; }

    @PutMapping
    public ResponseEntity<Void> register(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody DeviceTokenRequest request) {
        service.register(userId(jwt), request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> unregister(@AuthenticationPrincipal Jwt jwt,
            @RequestParam String token) {
        service.unregister(userId(jwt), token);
        return ResponseEntity.noContent().build();
    }

    private Integer userId(Jwt jwt) { return Integer.valueOf(jwt.getSubject()); }
}
