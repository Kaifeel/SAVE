package com.save.recommendation;

import com.save.common.BusinessException;
import com.save.item.Item;
import com.save.item.ItemRepository;
import com.save.item.ItemStatus;
import com.save.user.User;
import com.save.user.UserRepository;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RecommendationService {
    private final RecommendationRepository recommendationRepository;
    private final ItemRepository itemRepository;
    private final UserRepository userRepository;
    private final OpenAiRecommendationClient openAiClient;

    public RecommendationService(RecommendationRepository recommendationRepository,
                                 ItemRepository itemRepository, UserRepository userRepository,
                                 OpenAiRecommendationClient openAiClient) {
        this.recommendationRepository = recommendationRepository;
        this.itemRepository = itemRepository;
        this.userRepository = userRepository;
        this.openAiClient = openAiClient;
    }

    @Transactional
    public RecommendationResponse recommend(Integer userId, RecommendationRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "사용자가 존재하지 않습니다."));
        List<String> keywords = openAiClient.recommendKeywords(request);
        List<Item> available = itemRepository.findByStatusNotOrderByCreatedAtDesc(ItemStatus.DELETED)
                .stream().filter(item -> item.getStatus() == ItemStatus.AVAILABLE)
                .filter(item -> !item.getUser().getId().equals(userId)).toList();
        Set<Item> selected = new LinkedHashSet<>();
        for (String keyword : keywords) {
            String normalized = keyword.toLowerCase(Locale.ROOT);
            available.stream().filter(item -> item.getTitle().toLowerCase(Locale.ROOT).contains(normalized)
                    || (item.getDescription() != null
                    && item.getDescription().toLowerCase(Locale.ROOT).contains(normalized)))
                    .limit(3).forEach(selected::add);
        }
        if (selected.isEmpty()) available.stream().limit(5).forEach(selected::add);
        Recommendation saved = recommendationRepository.save(new Recommendation(user, request,
                keywords, selected.stream().limit(10).toList()));
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
}
