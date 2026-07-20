package com.save.recommendation;

import com.save.item.ItemResponse;
import java.time.LocalDateTime;
import java.util.List;

public record RecommendationResponse(Integer id, String university, String weather,
                                     String situation, String reason, List<ItemResponse> items,
                                     LocalDateTime createdAt) {
    public static RecommendationResponse from(Recommendation recommendation) {
        String reason = recommendation.getSituation() == null || recommendation.getSituation().isBlank()
                ? "현재 대여 가능한 최신 물품을 추천했습니다."
                : "'" + recommendation.getSituation() + "' 상황에 사용할 수 있는 물품입니다.";
        return new RecommendationResponse(recommendation.getId(), recommendation.getUniversity(),
                recommendation.getWeather(), recommendation.getSituation(), reason,
                recommendation.getItems().stream().map(item -> ItemResponse.from(item, false)).toList(),
                recommendation.getCreatedAt());
    }
}
