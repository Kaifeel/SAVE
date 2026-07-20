package com.save.recommendation;

import com.save.item.ItemResponse;
import java.time.LocalDateTime;
import java.util.List;

public record RecommendationResponse(Integer recommendationId,
                                     List<String> recommendedKeywords,
                                     List<ItemResponse> recommendedItems,
                                     String department,
                                     List<String> interestItems,
                                     String timePeriod,
                                     boolean isExamPeriod,
                                     String weatherStatus,
                                     LocalDateTime createdAt) {
    public static RecommendationResponse from(Recommendation recommendation) {
        return new RecommendationResponse(recommendation.getId(),
                recommendation.getRecommendedKeywords(),
                recommendation.getItems().stream()
                        .map(item -> ItemResponse.from(item, false, 0)).toList(),
                recommendation.getDepartment(), recommendation.getInterestItems(),
                recommendation.getTimePeriod(), recommendation.isExamPeriod(),
                recommendation.getWeatherStatus(), recommendation.getCreatedAt());
    }
}
