package com.save.user;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.save.item.PickupLocation;
import com.save.item.PickupLocationRepository;
import com.save.university.University;
import com.save.university.UniversityRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PublicUserProfileIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UniversityRepository universityRepository;
    @Autowired PickupLocationRepository pickupLocationRepository;

    private Integer universityId;
    private Integer pickupLocationId;

    @BeforeEach
    void setUpReferenceData() {
        University university = universityRepository.findByName("부경대학교")
                .orElseGet(() -> universityRepository.save(new University("부경대학교")));
        universityId = university.getId();
        pickupLocationId = pickupLocationRepository
                .save(new PickupLocation(university, "대연캠퍼스")).getId();
    }

    @Test
    void exposesOnlyPublicProfileFieldsAndVisibleItems() throws Exception {
        JsonNode owner = signUp("profile-owner@pukyong.ac.kr", "프로필주인");
        JsonNode viewer = signUp("profile-viewer@pukyong.ac.kr", "프로필조회자");
        int ownerId = owner.get("user").get("id").asInt();
        String ownerToken = owner.get("access_token").asText();
        String viewerToken = viewer.get("access_token").asText();

        mockMvc.perform(post("/api/v1/items")
                        .header("Authorization", bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"프로필 공개 우산","rental_fee":1000,"rental_unit":"DAY",
                                 "pickup_location_id":%d,"type":"LEND","description":"깨끗합니다."}
                                """.formatted(pickupLocationId)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/users/{userId}/profile", ownerId)
                        .header("Authorization", bearer(viewerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(ownerId))
                .andExpect(jsonPath("$.name").value("프로필주인"))
                .andExpect(jsonPath("$.department").value("컴퓨터공학과"))
                .andExpect(jsonPath("$.university_name").value("부경대학교"))
                .andExpect(jsonPath("$.rating").value(0.0))
                .andExpect(jsonPath("$.review_count").value(0))
                .andExpect(jsonPath("$.completed_trade_count").value(0))
                .andExpect(jsonPath("$.email").doesNotExist())
                .andExpect(jsonPath("$.oauth_id").doesNotExist())
                .andExpect(jsonPath("$.password_hash").doesNotExist())
                .andExpect(jsonPath("$.role").doesNotExist());

        mockMvc.perform(get("/api/v1/users/{userId}/items", ownerId)
                        .header("Authorization", bearer(viewerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("프로필 공개 우산"))
                .andExpect(jsonPath("$[0].owner_id").value(ownerId));
    }

    @Test
    void returnsNotFoundForAnUnknownProfile() throws Exception {
        JsonNode viewer = signUp("missing-profile-viewer@pukyong.ac.kr", "프로필조회자");

        mockMvc.perform(get("/api/v1/users/999999/profile")
                        .header("Authorization", bearer(viewer.get("access_token").asText())))
                .andExpect(status().isNotFound());
    }

    private JsonNode signUp(String email, String name) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"password123\","
                                + "\"name\":\"" + name + "\",\"department\":\"컴퓨터공학과\","
                                + "\"university_id\":" + universityId + "}"))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
