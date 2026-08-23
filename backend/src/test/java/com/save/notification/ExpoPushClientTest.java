package com.save.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpMethod.POST;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class ExpoPushClientTest {
    private MockRestServiceServer server;
    private ExpoPushClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://exp.host");
        server = MockRestServiceServer.bindTo(builder).build();
        client = new ExpoPushClient(
                builder.build(), true,
                Duration.ofSeconds(3), Duration.ofSeconds(5));
    }

    @Test
    void sendsJsonAndParsesTicketsInRequestOrder() {
        server.expect(once(), requestTo("https://exp.host/--/api/v2/push/send"))
                .andExpect(method(POST))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().json("""
                        [{"to":"ExpoPushToken[first]","title":"새 메시지","body":"안녕하세요",
                          "data":{"type":"CHAT_MESSAGE","roomId":7}},
                         {"to":"ExpoPushToken[second]","title":"새 메시지","body":"실패",
                          "data":{"type":"CHAT_MESSAGE","roomId":7}}]
                        """))
                .andRespond(withSuccess("""
                        {"data":[
                          {"status":"ok","id":"ticket-1"},
                          {"status":"error","message":"Device is not registered",
                           "details":{"error":"DeviceNotRegistered"}}
                        ]}
                        """, MediaType.APPLICATION_JSON));

        List<ExpoPushTicketResponse> tickets = client.send(List.of(
                new ExpoPushMessage("ExpoPushToken[first]", "새 메시지", "안녕하세요",
                        Map.of("type", "CHAT_MESSAGE", "roomId", 7)),
                new ExpoPushMessage("ExpoPushToken[second]", "새 메시지", "실패",
                        Map.of("type", "CHAT_MESSAGE", "roomId", 7))));

        assertThat(tickets).containsExactly(
                new ExpoPushTicketResponse("ok", "ticket-1", null, null),
                new ExpoPushTicketResponse(
                        "error", null, "DeviceNotRegistered", "Device is not registered"));
        assertThat(client.connectTimeout()).isEqualTo(Duration.ofSeconds(3));
        assertThat(client.readTimeout()).isEqualTo(Duration.ofSeconds(5));
        server.verify();
    }

    @Test
    void retrievesReceiptResultsByTicketId() {
        server.expect(requestTo("https://exp.host/--/api/v2/push/getReceipts"))
                .andExpect(method(POST))
                .andExpect(content().json("{\"ids\":[\"ticket-1\",\"ticket-2\"]}"))
                .andRespond(withSuccess("""
                        {"data":{
                          "ticket-1":{"status":"ok"},
                          "ticket-2":{"status":"error","message":"Unregistered",
                            "details":{"error":"DeviceNotRegistered"}}
                        }}
                        """, MediaType.APPLICATION_JSON));

        Map<String, ExpoPushTicketResponse> receipts = client.getReceipts(
                new java.util.LinkedHashSet<>(List.of("ticket-1", "ticket-2")));

        assertThat(receipts.get("ticket-1").status()).isEqualTo("ok");
        assertThat(receipts.get("ticket-2").errorCode()).isEqualTo("DeviceNotRegistered");
        server.verify();
    }

    @Test
    void disabledProviderDoesNotMakeHttpRequests() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://exp.host");
        MockRestServiceServer disabledServer = MockRestServiceServer.bindTo(builder).build();
        ExpoPushClient disabled = new ExpoPushClient(
                builder.build(), false,
                Duration.ofSeconds(3), Duration.ofSeconds(5));

        assertThat(disabled.send(List.of(new ExpoPushMessage(
                "ExpoPushToken[first]", "title", "body", Map.of())))).isEmpty();
        assertThat(disabled.getReceipts(Set.of("ticket-1"))).isEmpty();
        disabledServer.verify();
    }
}
