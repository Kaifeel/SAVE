package com.save.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.save.user.User;
import com.save.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class AuthIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired RefreshTokenRepository refreshTokenRepository;
    @Autowired PasswordEncoder passwordEncoder;

    @BeforeEach
    @AfterEach
    void cleanUp() {
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void signUpHashesPasswordAndReturnsUsableToken() throws Exception {
        String body = """
                {"email":"Student@PUKYONG.AC.KR","password":"password123",
                 "name":"학생","department":"컴퓨터공학과"}
                """;

        String response = mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.access_token").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("student@pukyong.ac.kr"))
                .andReturn().getResponse().getContentAsString();

        User saved = userRepository.findByEmailIgnoreCase("student@pukyong.ac.kr").orElseThrow();
        assertThat(saved.getPasswordHash()).isNotEqualTo("password123");
        assertThat(passwordEncoder.matches("password123", saved.getPasswordHash())).isTrue();

        JsonNode json = objectMapper.readTree(response);
        mockMvc.perform(get("/api/v1/chats/rooms")
                        .header("Authorization", "Bearer " + json.get("access_token").asText()))
                .andExpect(status().isOk());
    }

    @Test
    void loginRejectsWrongPassword() throws Exception {
        userRepository.save(User.local("student@pukyong.ac.kr",
                passwordEncoder.encode("password123"), "학생", null));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"student@pukyong.ac.kr","password":"wrong-password"}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("이메일 또는 비밀번호가 올바르지 않습니다."));
    }

    @Test
    void signUpRejectsNonPukyongAndLookalikeDomains() throws Exception {
        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"student@example.com","password":"password123",
                                 "name":"학생","department":"컴퓨터공학과"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value("부경대학교 이메일(@pukyong.ac.kr)만 사용할 수 있습니다."));

        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"student@fakepukyong.ac.kr","password":"password123",
                                 "name":"학생","department":"컴퓨터공학과"}
                                """))
                .andExpect(status().isBadRequest());

        assertThat(userRepository.count()).isZero();
    }

    @Test
    void loginRejectsNonPukyongEmailBeforeAuthentication() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"student@example.com","password":"password123"}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message")
                        .value("부경대학교 이메일(@pukyong.ac.kr)만 사용할 수 있습니다."));
    }
}
