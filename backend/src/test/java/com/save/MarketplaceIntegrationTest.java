package com.save;

import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.save.item.PickupLocation;
import com.save.item.PickupLocationRepository;
import com.save.university.University;
import com.save.university.UniversityRepository;
import java.util.Base64;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@TestPropertySource(properties = "storage.local-root=build/test-uploads")
class MarketplaceIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UniversityRepository universityRepository;
    @Autowired PickupLocationRepository pickupLocationRepository;
    private Integer universityId;
    private Integer pickupLocationId;
    private Integer otherUniversityId;

    @BeforeEach
    void setUpReferenceData() {
        University university = universityRepository.findByName("부경대학교")
                .orElseGet(() -> universityRepository.save(new University("부경대학교")));
        universityId = university.getId();
        otherUniversityId = universityRepository.findByName("다른대학교")
                .orElseGet(() -> universityRepository.save(new University("다른대학교")))
                .getId();
        pickupLocationId = pickupLocationRepository
                .save(new PickupLocation(university, "대연캠퍼스")).getId();
    }

    @Test
    void multipartItemCreationUsesJavaBeanFieldNames() throws Exception {
        String ownerToken = signUp("multipart@pukyong.ac.kr", "사진등록자")
                .get("access_token").asText();
        byte[] png = Base64.getDecoder().decode(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=");
        MockMultipartFile photo = new MockMultipartFile(
                "photos", "umbrella.png", "image/png", png);

        MvcResult result = mockMvc.perform(multipart("/api/v1/items")
                        .file(photo)
                        .header("Authorization", bearer(ownerToken))
                        .param("title", "멀티파트 우산")
                        .param("rentalFee", "1000")
                        .param("rentalUnit", "DAY")
                        .param("pickupLocationId", pickupLocationId.toString())
                        .param("type", "LEND")
                        .param("description", "깨끗합니다.")
                        .param("precautions", "분실 주의"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("멀티파트 우산"))
                .andExpect(jsonPath("$.rental_fee").value(1000))
                .andExpect(jsonPath("$.pickup_location_id").value(pickupLocationId))
                .andExpect(jsonPath("$.image_urls[0]").value(matchesPattern(
                        "/uploads/items/[0-9]{4}/[0-9]{2}/[0-9a-f-]+\\.png")))
                .andReturn();

        String imageUrl = objectMapper.readTree(result.getResponse().getContentAsString())
                .get("image_urls").get(0).asText();
        mockMvc.perform(get(imageUrl))
                .andExpect(status().isOk())
                .andExpect(content().bytes(png));
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
                .andExpect(jsonPath("$.created_at").value(matchesPattern(".*Z$")))
                .andExpect(jsonPath("$.updated_at").value(matchesPattern(".*Z$")))
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
                .andExpect(jsonPath("$.item_title").value("테스트 우산"))
                .andExpect(jsonPath("$.borrower_name").value("대여학생"))
                .andExpect(jsonPath("$.lender_name").value("물품주인"))
                .andReturn();
        int rentalId = objectMapper.readTree(rentalResult.getResponse().getContentAsString())
                .get("id").asInt();

        mockMvc.perform(get("/api/v1/items/{itemId}", itemId)
                        .header("Authorization", bearer(borrowerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REQUEST_PENDING"));
        mockMvc.perform(get("/api/v1/notifications")
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].type").value("RENTAL_REQUESTED"))
                .andExpect(jsonPath("$[0].item_id").value(itemId));

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
                .andExpect(status().isNotFound());
        mockMvc.perform(patch("/api/v1/rentals/{rentalId}/paid", rentalId)
                        .header("Authorization", bearer(borrowerToken)))
                .andExpect(status().isNotFound());
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
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/v1/rentals/{rentalId}/return", rentalId)
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RETURNED"));
        mockMvc.perform(get("/api/v1/items/{itemId}", itemId)
                        .header("Authorization", bearer(borrowerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("AVAILABLE"));
        mockMvc.perform(get("/api/v1/users/{userId}/profile",
                        owner.get("user").get("id").asInt())
                        .header("Authorization", bearer(borrowerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completed_trade_count").value(1));
        mockMvc.perform(post("/api/v1/rentals")
                        .header("Authorization", bearer(borrowerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"item_id\":" + itemId + ",\"chat_room_id\":" + chatRoomId
                                + ",\"start_date\":\"2026-07-23T10:00:00\","
                                + "\"end_date\":\"2026-07-24T10:00:00\",\"total_price\":1000}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("REQUESTED"));
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
        mockMvc.perform(get("/api/v1/notifications")
                        .header("Authorization", bearer(borrowerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].type").value("RENTAL_REJECTED"));
    }

    @Test
    void deletedItemDisappearsFromWishlist() throws Exception {
        JsonNode owner = signUp("wishlist-owner@pukyong.ac.kr", "관심목록주인");
        JsonNode borrower = signUp("wishlist-borrower@pukyong.ac.kr", "관심목록학생");
        String ownerToken = owner.get("access_token").asText();
        String borrowerToken = borrower.get("access_token").asText();
        int deletedItemId = createItem(ownerToken, "삭제할 우산");
        int activeItemId = createItem(ownerToken, "남아 있는 우산");

        mockMvc.perform(post("/api/v1/items/{itemId}/wishlist", deletedItemId)
                        .header("Authorization", bearer(borrowerToken)))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/v1/items/{itemId}/wishlist", activeItemId)
                        .header("Authorization", bearer(borrowerToken)))
                .andExpect(status().isCreated());

        mockMvc.perform(delete("/api/v1/items/{itemId}", deletedItemId)
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/users/me/wishlist")
                        .header("Authorization", bearer(borrowerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(activeItemId));
    }

    @Test
    void marketplaceCampusIsDerivedFromAuthenticatedUser() throws Exception {
        JsonNode owner = signUp("campus-owner@pukyong.ac.kr", "같은대학주인");
        JsonNode sameCampusUser = signUp("campus-peer@pukyong.ac.kr", "같은대학학생");
        JsonNode outsider = signUpAt(
                "campus-outsider@pukyong.ac.kr", "다른대학학생", otherUniversityId);
        String ownerToken = owner.get("access_token").asText();
        String sameCampusToken = sameCampusUser.get("access_token").asText();
        String outsiderToken = outsider.get("access_token").asText();
        int itemId = createItem(ownerToken, "교내 전용 우산");

        mockMvc.perform(get("/api/v1/items")
                        .header("Authorization", bearer(sameCampusToken))
                        .param("university_id", otherUniversityId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(itemId));
        mockMvc.perform(get("/api/v1/items")
                        .header("Authorization", bearer(outsiderToken))
                        .param("university_id", universityId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(0));
        mockMvc.perform(get("/api/v1/items/{itemId}", itemId)
                        .header("Authorization", bearer(outsiderToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/items/{itemId}/wishlist", itemId)
                        .header("Authorization", bearer(outsiderToken)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/chats/rooms")
                        .header("Authorization", bearer(outsiderToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"item_id\":" + itemId + "}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/rentals")
                        .header("Authorization", bearer(outsiderToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"item_id\":" + itemId + ",\"chat_room_id\":999,"
                                + "\"start_date\":\"2026-07-21T10:00:00\","
                                + "\"end_date\":\"2026-07-22T10:00:00\","
                                + "\"total_price\":1000}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void reportRejectsAChatRoomTheReporterDidNotJoin() throws Exception {
        JsonNode owner = signUp("report-owner@pukyong.ac.kr", "신고대상");
        JsonNode participant = signUp("report-participant@pukyong.ac.kr", "채팅참여자");
        JsonNode outsider = signUp("report-outsider@pukyong.ac.kr", "채팅외부인");
        int itemId = createItem(owner.get("access_token").asText(), "신고 테스트 우산");
        int roomId = createRoom(participant.get("access_token").asText(), itemId);

        mockMvc.perform(post("/api/v1/reports")
                        .header("Authorization", bearer(outsider.get("access_token").asText()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reported_user_id\":" + owner.get("user").get("id").asInt()
                                + ",\"item_id\":" + itemId + ",\"chat_room_id\":" + roomId
                                + ",\"reason\":\"참여하지 않은 채팅방 신고 시도입니다\"}"))
                .andExpect(status().isForbidden());
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
        return signUpAt(email, name, universityId);
    }

    private JsonNode signUpAt(String email, String name, Integer signupUniversityId)
            throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"password123\","
                                + "\"name\":\"" + name + "\",\"department\":\"컴퓨터공학과\","
                                + "\"university_id\":" + signupUniversityId + "}"))
                .andExpect(status().isCreated()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String bearer(String token) { return "Bearer " + token; }
}
