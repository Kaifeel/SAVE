package com.save.recommendation;

import java.util.List;

public record AiRecommendationResult(String headline, List<RecommendedItem> recommendations) {
    public record RecommendedItem(Integer itemId, String reason) {}
}
