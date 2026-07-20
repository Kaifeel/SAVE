package com.save.recommendation;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecommendationRepository extends JpaRepository<Recommendation, Integer> {
    List<Recommendation> findByUserIdOrderByCreatedAtDesc(Integer userId);
}
