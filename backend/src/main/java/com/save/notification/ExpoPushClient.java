package com.save.notification;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class ExpoPushClient {
    private final RestClient restClient;
    private final boolean enabled;
    private final Duration connectTimeout;
    private final Duration readTimeout;

    @Autowired
    public ExpoPushClient(RestClient.Builder builder,
                          @Value("${expo.push.enabled:false}") boolean enabled,
                          @Value("${expo.push.base-url:https://exp.host}") String baseUrl,
                          @Value("${expo.push.connect-timeout:3s}") Duration connectTimeout,
                          @Value("${expo.push.read-timeout:5s}") Duration readTimeout) {
        this(builder.baseUrl(baseUrl)
                        .requestFactory(requestFactory(connectTimeout, readTimeout))
                        .build(),
                enabled, connectTimeout, readTimeout);
    }

    ExpoPushClient(RestClient restClient, boolean enabled,
                   Duration connectTimeout, Duration readTimeout) {
        this.restClient = restClient;
        this.enabled = enabled;
        this.connectTimeout = connectTimeout;
        this.readTimeout = readTimeout;
    }

    public List<ExpoPushTicketResponse> send(List<ExpoPushMessage> messages) {
        if (!enabled || messages.isEmpty()) return List.of();
        JsonNode response = restClient.post()
                .uri("/--/api/v2/push/send")
                .body(messages)
                .retrieve()
                .body(JsonNode.class);
        JsonNode data = require(response, "data");
        if (!data.isArray() || data.size() != messages.size()) {
            throw new IllegalStateException("Invalid Expo push ticket response");
        }
        List<ExpoPushTicketResponse> tickets = new ArrayList<>(data.size());
        data.forEach(ticket -> tickets.add(parseResult(ticket)));
        return tickets;
    }

    public Map<String, ExpoPushTicketResponse> getReceipts(Set<String> ticketIds) {
        if (!enabled || ticketIds.isEmpty()) return Map.of();
        JsonNode response = restClient.post()
                .uri("/--/api/v2/push/getReceipts")
                .body(Map.of("ids", ticketIds))
                .retrieve()
                .body(JsonNode.class);
        JsonNode data = require(response, "data");
        if (!data.isObject()) throw new IllegalStateException("Invalid Expo push receipt response");
        Map<String, ExpoPushTicketResponse> receipts = new LinkedHashMap<>();
        ticketIds.forEach(ticketId -> {
            JsonNode receipt = data.get(ticketId);
            if (receipt != null) receipts.put(ticketId, parseResult(receipt));
        });
        return receipts;
    }

    Duration connectTimeout() {
        return connectTimeout;
    }

    Duration readTimeout() {
        return readTimeout;
    }

    public boolean enabled() {
        return enabled;
    }

    private ExpoPushTicketResponse parseResult(JsonNode result) {
        String status = requiredText(result, "status");
        String id = optionalText(result, "id");
        String message = optionalText(result, "message");
        JsonNode details = result.get("details");
        String errorCode = details == null ? null : optionalText(details, "error");
        return new ExpoPushTicketResponse(status, id, errorCode, message);
    }

    private JsonNode require(JsonNode node, String field) {
        if (node == null || node.get(field) == null) {
            throw new IllegalStateException("Invalid Expo push response: " + field);
        }
        return node.get(field);
    }

    private String requiredText(JsonNode node, String field) {
        String value = optionalText(node, field);
        if (value == null) throw new IllegalStateException("Invalid Expo push response: " + field);
        return value;
    }

    private String optionalText(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value != null && value.isTextual() ? value.asText() : null;
    }

    private static SimpleClientHttpRequestFactory requestFactory(
            Duration connectTimeout, Duration readTimeout) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeout);
        factory.setReadTimeout(readTimeout);
        return factory;
    }
}
