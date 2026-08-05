package com.save.rental;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/rentals")
public class RentalController {
    private final RentalService rentalService;
    public RentalController(RentalService rentalService) { this.rentalService = rentalService; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RentalResponse create(@AuthenticationPrincipal Jwt jwt,
                                 @Valid @RequestBody RentalCreateRequest request) {
        return rentalService.create(userId(jwt), request);
    }

    @GetMapping("/me")
    public List<RentalResponse> mine(@AuthenticationPrincipal Jwt jwt) {
        return rentalService.getMine(userId(jwt));
    }

    @GetMapping("/{rentalId}")
    public RentalResponse detail(@PathVariable Integer rentalId, @AuthenticationPrincipal Jwt jwt) {
        return rentalService.detail(rentalId, userId(jwt));
    }

    @PatchMapping("/{rentalId}/reject")
    public RentalResponse reject(@PathVariable Integer rentalId, @AuthenticationPrincipal Jwt jwt) {
        return rentalService.reject(rentalId, userId(jwt));
    }

    @PatchMapping("/{rentalId}/cancel")
    public RentalResponse cancel(@PathVariable Integer rentalId, @AuthenticationPrincipal Jwt jwt) {
        return rentalService.cancel(rentalId, userId(jwt));
    }

    @PatchMapping("/{rentalId}/start")
    public RentalResponse startRenting(@PathVariable Integer rentalId,
                                       @AuthenticationPrincipal Jwt jwt) {
        return rentalService.startRenting(rentalId, userId(jwt));
    }

    @PatchMapping("/{rentalId}/return")
    public RentalResponse returnItem(@PathVariable Integer rentalId, @AuthenticationPrincipal Jwt jwt) {
        return rentalService.returnItem(rentalId, userId(jwt));
    }

    private Integer userId(Jwt jwt) { return Integer.valueOf(jwt.getSubject()); }
}
