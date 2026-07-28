package com.save.recommendation;

import java.util.List;

public record RecommendationAiInput(
        String department,
        List<String> interestItems,
        String timePeriod,
        boolean examPeriod,
        String weatherStatus,
        List<CandidateItem> candidates) {
    public record CandidateItem(Integer id, String title, Integer rentalFee,
                                String rentalUnit, String pickupLocation,
                                String description) {}
}
