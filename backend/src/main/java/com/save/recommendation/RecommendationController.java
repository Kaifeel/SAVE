package com.save.recommendation;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/recommendations")
public class RecommendationController {
    private final RecommendationService recommendationService;
    public RecommendationController(RecommendationService recommendationService) {
        this.recommendationService = recommendationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RecommendationResponse recommend(@AuthenticationPrincipal Jwt jwt,
                                             @Valid @RequestBody RecommendationRequest request) {
        return recommendationService.recommend(userId(jwt), request);
    }

    @GetMapping("/me")
    public List<RecommendationResponse> history(@AuthenticationPrincipal Jwt jwt) {
        return recommendationService.history(userId(jwt));
    }

    @GetMapping("/{recommendationId}")
    public RecommendationResponse detail(@PathVariable Integer recommendationId,
                                         @AuthenticationPrincipal Jwt jwt) {
        return recommendationService.detail(recommendationId, userId(jwt));
    }

    private Integer userId(Jwt jwt) { return Integer.valueOf(jwt.getSubject()); }
}
