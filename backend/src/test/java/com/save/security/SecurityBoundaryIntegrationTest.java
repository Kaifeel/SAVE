package com.save.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.save.user.User;
import com.save.user.UserRepository;
import java.time.LocalDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "security.cors.allowed-origins=https://save.example")
@AutoConfigureMockMvc
class SecurityBoundaryIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;

    @Test
    void corsAllowsOnlyConfiguredOrigin() throws Exception {
        mockMvc.perform(options("/api/v1/items")
                        .header("Origin", "https://save.example")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin",
                        "https://save.example"));

        mockMvc.perform(options("/api/v1/items")
                        .header("Origin", "https://evil.example")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    void suspendedUserCannotAccessAuthenticatedApi() throws Exception {
        String email = "suspended-" + UUID.randomUUID() + "@pknu.ac.kr";
        String response = mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"password123",
                                 "name":"정지 사용자","department":"컴퓨터공학과"}
                                """.formatted(email)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        JsonNode auth = objectMapper.readTree(response);
        User user = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        user.sanction(LocalDateTime.now().plusDays(7), "테스트");
        userRepository.saveAndFlush(user);

        mockMvc.perform(get("/api/v1/users/me")
                        .header("Authorization",
                                "Bearer " + auth.get("access_token").asText()))
                .andExpect(status().isForbidden());
    }
}
