package com.save.recommendation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.save.common.BusinessException;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class OpenAiRecommendationClient {
    private final String apiKey;
    private final String model;
    private final ObjectMapper objectMapper;

    public OpenAiRecommendationClient(@Value("${openai.api-key:}") String apiKey,
                                      @Value("${openai.model:gpt-4o-mini}") String model,
                                      ObjectMapper objectMapper) {
        this.apiKey = apiKey;
        this.model = model;
        this.objectMapper = objectMapper;
    }

    public List<String> recommendKeywords(RecommendationRequest request) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE,
                    "OPENAI_API_KEY가 설정되지 않았습니다.");
        }
        try {
            RestClient client = RestClient.builder().baseUrl("https://api.openai.com")
                    .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey).build();
            JsonNode response = client.post().uri("/v1/chat/completions")
                    .body(requestBody(request)).retrieve().body(JsonNode.class);
            String content = response.path("choices").path(0).path("message").path("content").asText();
            JsonNode parsed = objectMapper.readTree(content);
            List<String> keywords = objectMapper.readerForListOf(String.class)
                    .readValue(parsed.path("recommended_keywords"));
            if (keywords.isEmpty()) throw new IllegalStateException("empty recommendation");
            return keywords.stream().limit(10).toList();
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BusinessException(HttpStatus.BAD_GATEWAY, "OpenAI 추천 요청에 실패했습니다.");
        }
    }

    private Map<String, Object> requestBody(RecommendationRequest request) {
        String input = "학과: " + request.department()
                + "\n관심 물품: " + String.join(", ", request.interestItems())
                + "\n시간대: " + request.timePeriod()
                + "\n시험 기간: " + request.isExamPeriod()
                + "\n날씨: " + request.weatherStatus();
        Map<String, Object> schema = Map.of(
                "type", "object",
                "properties", Map.of("recommended_keywords", Map.of(
                        "type", "array", "items", Map.of("type", "string"),
                        "minItems", 1, "maxItems", 10)),
                "required", List.of("recommended_keywords"),
                "additionalProperties", false);
        return Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content",
                                "대학생 교내 물품 대여 서비스의 추천 도우미입니다. 입력 상황에 유용한 물품 검색 키워드를 한국어로 반환하세요."),
                        Map.of("role", "user", "content", input)),
                "response_format", Map.of("type", "json_schema", "json_schema", Map.of(
                        "name", "save_item_recommendation", "strict", true, "schema", schema)));
    }
}
