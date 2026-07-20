package com.save.recommendation;

import com.save.common.BusinessException;
import com.save.item.Item;
import com.save.item.ItemRepository;
import com.save.item.ItemStatus;
import com.save.user.User;
import com.save.user.UserRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RecommendationService {
    private final RecommendationRepository recommendationRepository;
    private final ItemRepository itemRepository;
    private final UserRepository userRepository;

    public RecommendationService(RecommendationRepository recommendationRepository,
                                 ItemRepository itemRepository, UserRepository userRepository) {
        this.recommendationRepository = recommendationRepository;
        this.itemRepository = itemRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public RecommendationResponse recommend(Integer userId, RecommendationRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "사용자가 존재하지 않습니다."));
        String university = request.university() == null || request.university().isBlank()
                ? "부경대학교" : request.university().trim();
        int limit = request.limit() == null ? 5 : request.limit();
        List<Item> items = itemRepository
                .findByUniversityAndStatusNotOrderByCreatedAtDesc(university, ItemStatus.DELETED)
                .stream().filter(item -> item.getStatus() == ItemStatus.AVAILABLE)
                .filter(item -> !item.getUser().getId().equals(userId)).limit(limit).toList();
        Recommendation saved = recommendationRepository.save(new Recommendation(user, university,
                trimToNull(request.weather()), trimToNull(request.situation()), items));
        return RecommendationResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<RecommendationResponse> history(Integer userId) {
        return recommendationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(RecommendationResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public RecommendationResponse detail(Integer id, Integer userId) {
        Recommendation recommendation = recommendationRepository.findById(id)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "추천 내역이 존재하지 않습니다."));
        if (!recommendation.getUser().getId().equals(userId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "추천 내역에 접근할 권한이 없습니다.");
        }
        return RecommendationResponse.from(recommendation);
    }

    private String trimToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
