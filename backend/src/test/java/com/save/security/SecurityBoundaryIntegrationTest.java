package com.save.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.save.user.User;
import com.save.user.UserRepository;
import java.time.LocalDateTime;
import java.time.Instant;
import java.util.UUID;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;

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
    @Autowired JwtTokenService jwtTokenService;
    @Autowired JwtEncoder jwtEncoder;

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
    void googleRedirectAcceptsCredentialPostFromGoogleOrigin() throws Exception {
        mockMvc.perform(post("/api/v1/auth/google/redirect")
                        .header("Origin", "https://accounts.google.com")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("credential", "invalid-token")
                .param("g_csrf_token", "request-token")
                        .cookie(new Cookie("g_csrf_token", "different-cookie")))
                .andExpect(status().isBadRequest())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    void googleRedirectAcceptsNavigationPostWithOpaqueOrigin() throws Exception {
        mockMvc.perform(post("/api/v1/auth/google/redirect")
                        .header("Origin", "null")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("credential", "invalid-token")
                        .param("g_csrf_token", "request-token")
                        .cookie(new Cookie("g_csrf_token", "different-cookie")))
                .andExpect(status().isBadRequest())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    void suspendedUserCannotAccessAuthenticatedApi() throws Exception {
        String email = "suspended-" + UUID.randomUUID() + "@pukyong.ac.kr";
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

    @Test
    void deletedOrUnknownJwtSubjectCannotAccessAuthenticatedApi() throws Exception {
        User user = userRepository.save(new User(
                "deleted-" + UUID.randomUUID() + "@pukyong.ac.kr",
                "삭제 사용자", null, null, "GOOGLE", UUID.randomUUID().toString()));
        String token = jwtTokenService.issue(user);
        userRepository.delete(user);
        userRepository.flush();

        mockMvc.perform(get("/api/v1/users/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void jwtWithWrongIssuerIsRejected() throws Exception {
        User user = userRepository.save(new User(
                "issuer-" + UUID.randomUUID() + "@pukyong.ac.kr",
                "발급자 검사", null, null, "GOOGLE", UUID.randomUUID().toString()));
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("attacker-api")
                .issuedAt(now)
                .expiresAt(now.plusSeconds(900))
                .subject(user.getId().toString())
                .claim("role", "USER")
                .build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();

        mockMvc.perform(get("/api/v1/users/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }
}
