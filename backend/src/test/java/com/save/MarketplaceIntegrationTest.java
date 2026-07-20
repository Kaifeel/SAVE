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
        String ownerToken = owner.get("accessToken").asText();
        String borrowerToken = borrower.get("accessToken").asText();

        MvcResult created = mockMvc.perform(post("/api/v1/items")
                        .header("Authorization", bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"테스트 우산","price":1000,"priceType":"일",
                                 "location":"대연캠퍼스","type":"rent","university":"부경대학교",
                                 "description":"깨끗한 우산입니다."}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("테스트 우산"))
                .andExpect(jsonPath("$.ownerName").value("물품주인"))
                .andReturn();
        int itemId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asInt();

        mockMvc.perform(get("/api/v1/items")
                        .header("Authorization", bearer(borrowerToken))
                        .param("university", "부경대학교"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(itemId));

        mockMvc.perform(post("/api/v1/items/{itemId}/wishlist", itemId)
                        .header("Authorization", bearer(borrowerToken)))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/v1/users/me/wishlist")
                        .header("Authorization", bearer(borrowerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].wishlisted").value(true));

        mockMvc.perform(post("/api/v1/rentals")
                        .header("Authorization", bearer(borrowerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"itemId\":" + itemId + ",\"message\":\"대여하고 싶습니다.\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("pending"));

        mockMvc.perform(post("/api/v1/reports")
                        .header("Authorization", bearer(borrowerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetType\":\"ITEM\",\"targetId\":" + itemId
                                + ",\"itemId\":" + itemId + ",\"reason\":\"테스트 신고\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("pending"));

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
