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
public class OpenAiRecommendationClient implements RecommendationAiPort {
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

    @Override
    public AiRecommendationResult recommend(RecommendationAiInput input) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE,
                    "OPENAI_API_KEY가 설정되지 않았습니다.");
        }
        try {
            RestClient client = RestClient.builder().baseUrl("https://api.openai.com")
                    .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey).build();
            JsonNode response = client.post().uri("/v1/responses")
                    .body(requestBody(input)).retrieve().body(JsonNode.class);
            JsonNode parsed = structuredOutput(response);
            String headline = parsed.path("headline").asText();
            List<AiRecommendationResult.RecommendedItem> items = objectMapper.readerForListOf(
                    AiRecommendationResult.RecommendedItem.class)
                    .readValue(parsed.path("recommendations"));
            if (headline.isBlank() || items.isEmpty()) throw new IllegalStateException("empty recommendation");
            return new AiRecommendationResult(headline, items.stream().limit(3).toList());
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BusinessException(HttpStatus.BAD_GATEWAY, "OpenAI 추천 요청에 실패했습니다.");
        }
    }

    private JsonNode structuredOutput(JsonNode response) throws Exception {
        for (JsonNode output : response.path("output")) {
            for (JsonNode content : output.path("content")) {
                if ("refusal".equals(content.path("type").asText())) {
                    throw new IllegalStateException("model refusal");
                }
                if ("output_text".equals(content.path("type").asText())) {
                    return objectMapper.readTree(content.path("text").asText());
                }
            }
        }
        throw new IllegalStateException("missing structured output");
    }

    private Map<String, Object> requestBody(RecommendationAiInput input) {
        Map<String, Object> schema = Map.of(
                "type", "object",
                "properties", Map.of(
                        "headline", Map.of("type", "string"),
                        "recommendations", Map.of(
                                "type", "array", "minItems", 1, "maxItems", 3,
                                "items", Map.of(
                                        "type", "object",
                                        "properties", Map.of(
                                                "item_id", Map.of("type", "integer"),
                                                "reason", Map.of("type", "string")),
                                        "required", List.of("item_id", "reason"),
                                        "additionalProperties", false))),
                "required", List.of("headline", "recommendations"),
                "additionalProperties", false);
        return Map.of(
                "model", model,
                "input", List.of(
                        Map.of("role", "system", "content",
                                "SAVE 교내 대여 추천 엔진입니다. 후보 목록에 존재하는 item_id만 최대 3개 추천하세요."),
                        Map.of("role", "user", "content", objectMapper.valueToTree(input).toString())),
                "text", Map.of("format", Map.of(
                        "type", "json_schema", "name", "save_item_recommendation",
                        "strict", true, "schema", schema)));
    }
}
