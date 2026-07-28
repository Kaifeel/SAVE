package com.save.recommendation;

import com.save.common.BusinessException;
import com.save.item.Item;
import com.save.item.ItemRepository;
import com.save.item.ItemStatus;
import com.save.user.User;
import com.save.user.UserRepository;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RecommendationService {
    private final RecommendationRepository recommendationRepository;
    private final ItemRepository itemRepository;
    private final UserRepository userRepository;
    private final RecommendationAiPort openAiClient;

    public RecommendationService(RecommendationRepository recommendationRepository,
                                 ItemRepository itemRepository, UserRepository userRepository,
                                 RecommendationAiPort openAiClient) {
        this.recommendationRepository = recommendationRepository;
        this.itemRepository = itemRepository;
        this.userRepository = userRepository;
        this.openAiClient = openAiClient;
    }

    @Transactional
    public RecommendationResponse recommend(Integer userId, RecommendationRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "사용자가 존재하지 않습니다."));
        List<Item> available = itemRepository.findByStatusNotOrderByCreatedAtDesc(ItemStatus.DELETED)
                .stream().filter(item -> item.getStatus() == ItemStatus.AVAILABLE)
                .filter(item -> !item.getOwner().getId().equals(userId))
                .filter(item -> user.getUniversity() != null
                        && item.getOwner().getUniversity() != null
                        && item.getOwner().getUniversity().getId().equals(user.getUniversity().getId()))
                .limit(50).toList();
        Map<Integer, Item> candidates = available.stream().collect(
                LinkedHashMap::new, (map, item) -> map.put(item.getId(), item), Map::putAll);
        RecommendationAiInput input = new RecommendationAiInput(
                user.getDepartment(), request.interestItems(), request.timePeriod(),
                request.isExamPeriod(), request.weatherStatus(),
                available.stream().map(item -> new RecommendationAiInput.CandidateItem(
                        item.getId(), item.getTitle(), item.getRentalFee(),
                        item.getRentalUnit().name(),
                        item.getPickupLocation() == null ? null : item.getPickupLocation().getName(),
                        item.getDescription())).toList());
        AiRecommendationResult aiResult = openAiClient.recommend(input);
        Set<Integer> seen = new LinkedHashSet<>();
        List<AiRecommendationResult.RecommendedItem> valid = aiResult.recommendations().stream()
                .filter(result -> candidates.containsKey(result.itemId()))
                .filter(result -> seen.add(result.itemId()))
                .limit(3).toList();
        List<Item> selected = valid.stream().map(result -> candidates.get(result.itemId())).toList();
        Recommendation saved = recommendationRepository.save(new Recommendation(user, request,
                aiResult.headline(), valid.stream().map(
                        AiRecommendationResult.RecommendedItem::reason).toList(), selected));
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
