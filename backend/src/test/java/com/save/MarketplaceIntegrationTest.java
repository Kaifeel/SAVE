package com.save;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class MarketplaceIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @Test
    void frontendMarketplaceFlowUsesImplementedApis() throws Exception {
        JsonNode owner = signUp("owner@example.com", "물품주인");
        JsonNode borrower = signUp("borrower@example.com", "대여학생");
        String ownerToken = owner.get("access_token").asText();
        String borrowerToken = borrower.get("access_token").asText();

        MvcResult created = mockMvc.perform(post("/api/v1/items")
                        .header("Authorization", bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"테스트 우산","price":1000,"price_unit":"DAY",
                                 "pickup_location":"대연캠퍼스","type":"LEND","university":"부경대학교",
                                 "description":"깨끗한 우산입니다."}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("테스트 우산"))
                .andExpect(jsonPath("$.owner_name").value("물품주인"))
                .andReturn();
        int itemId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asInt();

        mockMvc.perform(get("/api/v1/items")
                        .header("Authorization", bearer(borrowerToken))
                        .param("university", "부경대학교"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(itemId));

        MvcResult room = mockMvc.perform(post("/api/v1/chats/rooms")
                        .header("Authorization", bearer(borrowerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"item_id\":" + itemId + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chat_room_id").isNumber())
                .andReturn();
        int chatRoomId = objectMapper.readTree(room.getResponse().getContentAsString())
                .get("chat_room_id").asInt();

        mockMvc.perform(post("/api/v1/items/{itemId}/wishlist", itemId)
                        .header("Authorization", bearer(borrowerToken)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.item_id").value(itemId));
        mockMvc.perform(get("/api/v1/users/me/wishlist")
                        .header("Authorization", bearer(borrowerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].wishlisted").value(true));

        mockMvc.perform(post("/api/v1/rentals")
                        .header("Authorization", bearer(borrowerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"item_id\":" + itemId + ",\"chat_room_id\":" + chatRoomId
                                + ",\"start_date\":\"2026-07-21T10:00:00\","
                                + "\"end_date\":\"2026-07-22T10:00:00\",\"total_price\":1000}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("REQUESTED"));

        mockMvc.perform(post("/api/v1/reports")
                        .header("Authorization", bearer(borrowerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reported_user_id\":" + owner.get("user").get("id").asInt()
                                + ",\"item_id\":" + itemId + ",\"chat_room_id\":" + chatRoomId
                                + ",\"reason\":\"테스트 신고\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"));

        mockMvc.perform(put("/api/v1/users/me/profile")
                        .header("Authorization", bearer(borrowerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"수정된학생\",\"department\":\"컴퓨터공학과\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("수정된학생"));
    }

    private JsonNode signUp(String email, String name) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"password123\","
                                + "\"name\":\"" + name + "\",\"department\":\"컴퓨터공학과\"}"))
                .andExpect(status().isCreated()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String bearer(String token) { return "Bearer " + token; }
}
