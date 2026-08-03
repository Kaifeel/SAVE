package com.save;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
    void frontendMarketplaceFlowUsesImplementedApis() throws Exception {
        JsonNode owner = signUp("owner@pukyong.ac.kr", "물품주인");
        JsonNode borrower = signUp("borrower@pukyong.ac.kr", "대여학생");
        String ownerToken = owner.get("access_token").asText();
        String borrowerToken = borrower.get("access_token").asText();

        MvcResult created = mockMvc.perform(post("/api/v1/items")
                        .header("Authorization", bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"테스트 우산","rental_fee":1000,"rental_unit":"DAY",
                                 "pickup_location_id":%d,"type":"LEND",
                                 "description":"깨끗한 우산입니다."}
                                """.formatted(pickupLocationId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("테스트 우산"))
                .andExpect(jsonPath("$.owner_name").value("물품주인"))
                .andExpect(jsonPath("$.owner_university_name").value("부경대학교"))
                .andExpect(jsonPath("$.pickup_location_name").value("대연캠퍼스"))
                .andReturn();
        int itemId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asInt();

        mockMvc.perform(get("/api/v1/items")
                        .header("Authorization", bearer(borrowerToken))
                        .param("university_id", universityId.toString()))
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

        MvcResult rentalResult = mockMvc.perform(post("/api/v1/rentals")
                        .header("Authorization", bearer(borrowerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"item_id\":" + itemId + ",\"chat_room_id\":" + chatRoomId
                                + ",\"start_date\":\"2026-07-21T10:00:00\","
                                + "\"end_date\":\"2026-07-22T10:00:00\",\"total_price\":1000}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("REQUESTED"))
                .andReturn();
        int rentalId = objectMapper.readTree(rentalResult.getResponse().getContentAsString())
                .get("id").asInt();

        mockMvc.perform(get("/api/v1/items/{itemId}", itemId)
                        .header("Authorization", bearer(borrowerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REQUEST_PENDING"));

        JsonNode secondBorrower = signUp("second@pukyong.ac.kr", "두번째학생");
        String secondBorrowerToken = secondBorrower.get("access_token").asText();
        MvcResult secondRoom = mockMvc.perform(post("/api/v1/chats/rooms")
                        .header("Authorization", bearer(secondBorrowerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"item_id\":" + itemId + "}"))
                .andExpect(status().isOk())
                .andReturn();
        int secondChatRoomId = objectMapper.readTree(secondRoom.getResponse().getContentAsString())
                .get("chat_room_id").asInt();
        mockMvc.perform(post("/api/v1/rentals")
                        .header("Authorization", bearer(secondBorrowerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"item_id\":" + itemId + ",\"chat_room_id\":" + secondChatRoomId
                                + ",\"start_date\":\"2026-07-21T10:00:00\","
                                + "\"end_date\":\"2026-07-22T10:00:00\",\"total_price\":1000}"))
                .andExpect(status().isConflict());

        mockMvc.perform(patch("/api/v1/rentals/{rentalId}/approve", rentalId)
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
        mockMvc.perform(get("/api/v1/items/{itemId}", itemId)
                        .header("Authorization", bearer(borrowerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESERVED"));
        mockMvc.perform(patch("/api/v1/rentals/{rentalId}/paid", rentalId)
                        .header("Authorization", bearer(borrowerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAID"));
        mockMvc.perform(patch("/api/v1/rentals/{rentalId}/start", rentalId)
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RENTING"));
        mockMvc.perform(get("/api/v1/items/{itemId}", itemId)
                        .header("Authorization", bearer(borrowerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RENTED"));
        mockMvc.perform(patch("/api/v1/rentals/{rentalId}/return", rentalId)
                        .header("Authorization", bearer(borrowerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RETURNED"));
        mockMvc.perform(get("/api/v1/items/{itemId}", itemId)
                        .header("Authorization", bearer(borrowerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("AVAILABLE"));

        mockMvc.perform(post("/api/v1/reports")
                        .header("Authorization", bearer(borrowerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reported_user_id\":" + owner.get("user").get("id").asInt()
                                + ",\"item_id\":" + itemId + ",\"reason\":\"         짧음\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/v1/reports")
                        .header("Authorization", bearer(borrowerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reported_user_id\":" + owner.get("user").get("id").asInt()
                                + ",\"item_id\":" + itemId + ",\"chat_room_id\":" + chatRoomId
                                + ",\"reason\":\"테스트 신고 상세 사유입니다\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reporter_name").value("대여학생"))
                .andExpect(jsonPath("$.reported_user_name").value("물품주인"))
                .andExpect(jsonPath("$.item_title").value("테스트 우산"))
                .andExpect(jsonPath("$.status").value("PENDING"));

        mockMvc.perform(put("/api/v1/users/me/profile")
                        .header("Authorization", bearer(borrowerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"수정된학생\",\"department\":\"컴퓨터공학과\","
                                + "\"university_id\":" + universityId + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("수정된학생"));
    }

    @Test
    void cancelAndRejectReleaseThePendingItem() throws Exception {
        JsonNode owner = signUp("release-owner@pukyong.ac.kr", "반납주인");
        JsonNode borrower = signUp("release-borrower@pukyong.ac.kr", "신청학생");
        String ownerToken = owner.get("access_token").asText();
        String borrowerToken = borrower.get("access_token").asText();
        int itemId = createItem(ownerToken, "잠금 테스트 우산");
        int chatRoomId = createRoom(borrowerToken, itemId);

        int canceledRentalId = requestRental(borrowerToken, itemId, chatRoomId);
        mockMvc.perform(patch("/api/v1/rentals/{rentalId}/cancel", canceledRentalId)
                        .header("Authorization", bearer(borrowerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELED"));
        mockMvc.perform(get("/api/v1/items/{itemId}", itemId)
                        .header("Authorization", bearer(borrowerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("AVAILABLE"));

        int rejectedRentalId = requestRental(borrowerToken, itemId, chatRoomId);
        mockMvc.perform(patch("/api/v1/rentals/{rentalId}/reject", rejectedRentalId)
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));
        mockMvc.perform(get("/api/v1/items/{itemId}", itemId)
                        .header("Authorization", bearer(borrowerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("AVAILABLE"));
    }

    private int createItem(String ownerToken, String title) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/items")
                        .header("Authorization", bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + title + "\",\"rental_fee\":1000,"
                                + "\"rental_unit\":\"DAY\",\"pickup_location_id\":"
                                + pickupLocationId + ",\"type\":\"LEND\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asInt();
    }

    private int createRoom(String borrowerToken, int itemId) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/chats/rooms")
                        .header("Authorization", bearer(borrowerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"item_id\":" + itemId + "}"))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("chat_room_id").asInt();
    }

    private int requestRental(String borrowerToken, int itemId, int chatRoomId) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/rentals")
                        .header("Authorization", bearer(borrowerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"item_id\":" + itemId + ",\"chat_room_id\":" + chatRoomId
                                + ",\"start_date\":\"2026-07-21T10:00:00\","
                                + "\"end_date\":\"2026-07-22T10:00:00\",\"total_price\":1000}"))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asInt();
    }

    private JsonNode signUp(String email, String name) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"password123\","
                                + "\"name\":\"" + name + "\",\"department\":\"컴퓨터공학과\","
                                + "\"university_id\":" + universityId + "}"))
                .andExpect(status().isCreated()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String bearer(String token) { return "Bearer " + token; }
}
