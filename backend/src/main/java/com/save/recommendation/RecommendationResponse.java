package com.save.recommendation;

import com.save.item.ItemResponse;
import com.save.item.ItemResponseMapper;
import com.save.review.ReviewSummary;
import java.time.LocalDateTime;
import java.util.List;

public record RecommendationResponse(Integer recommendationId,
                                     String headline,
                                     List<String> recommendationReasons,
                                     List<String> recommendedKeywords,
                                     List<ItemResponse> recommendedItems,
                                     String department,
                                     List<String> interestItems,
                                     String timePeriod,
                                     boolean isExamPeriod,
                                     String weatherStatus,
                                     LocalDateTime createdAt) {
    public static RecommendationResponse from(Recommendation recommendation,
                                              ItemResponseMapper itemResponseMapper) {
        return new RecommendationResponse(recommendation.getId(),
                recommendation.getHeadline(), recommendation.getReasons(),
                recommendation.getRecommendedKeywords(),
                recommendation.getItems().stream()
                        .map(item -> itemResponseMapper.from(
                                item, false, 0, ReviewSummary.empty())).toList(),
                recommendation.getDepartment(), recommendation.getInterestItems(),
                recommendation.getTimePeriod(), recommendation.isExamPeriod(),
                recommendation.getWeatherStatus(), recommendation.getCreatedAt());
    }
}
