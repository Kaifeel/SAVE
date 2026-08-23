package com.save.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.save.user.User;
import com.save.user.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
class MobileAuthIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired RefreshTokenRepository refreshTokenRepository;
    @Autowired UserRepository userRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtTokenService jwtTokenService;

    @MockBean GoogleOAuthService googleOAuthService;

    @BeforeEach
    @AfterEach
    void cleanUp() {
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void signupReturnsJsonSessionAndReusedTokenRevokesRotatedFamily() throws Exception {
        MvcResult signup = mockMvc.perform(post("/api/v1/auth/mobile/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"mobile@pukyong.ac.kr","password":"password123",
                                 "name":"모바일","department":"컴퓨터공학과"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(cookie().doesNotExist("save_refresh"))
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andExpect(jsonPath("$.access_token").isNotEmpty())
                .andExpect(jsonPath("$.refresh_token").isNotEmpty())
                .andExpect(jsonPath("$.refresh_token_expires_at").isNotEmpty())
                .andReturn();

        String firstToken = json(signup).get("refresh_token").asText();
        MvcResult refreshed = refresh(firstToken, 200);
        String rotatedToken = json(refreshed).get("refresh_token").asText();

        assertThat(rotatedToken).isNotEqualTo(firstToken);
        refresh(firstToken, 401);
        refresh(rotatedToken, 401);
    }

    @Test
    void refreshRejectsAbsentAndBlankTokens() throws Exception {
        mockMvc.perform(post("/api/v1/auth/mobile/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/v1/auth/mobile/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refresh_token\":\"   \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void logoutRevokesTokenFamilyWithoutWritingCookie() throws Exception {
        MvcResult signup = signUp("logout-mobile@pukyong.ac.kr");
        String token = json(signup).get("refresh_token").asText();

        mockMvc.perform(post("/api/v1/auth/mobile/logout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.createObjectNode()
                                .put("refresh_token", token).toString()))
                .andExpect(status().isNoContent())
                .andExpect(cookie().doesNotExist("save_refresh"))
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));

        refresh(token, 401);
    }

    @Test
    void loginReturnsRefreshTokenInJsonWithoutWritingCookie() throws Exception {
        userRepository.save(User.local("login-mobile@pukyong.ac.kr",
                passwordEncoder.encode("password123"), "모바일", "컴퓨터공학과"));

        mockMvc.perform(post("/api/v1/auth/mobile/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"login-mobile@pukyong.ac.kr",
                                 "password":"password123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andExpect(jsonPath("$.access_token").isNotEmpty())
                .andExpect(jsonPath("$.refresh_token").isNotEmpty());
    }

    @Test
    void googleReturnsRefreshTokenInJsonWithoutWritingCookie() throws Exception {
        User user = userRepository.save(new User(
                "google-mobile@pukyong.ac.kr", "구글모바일", null, null,
                "GOOGLE", "mobile-google-subject"));
        AuthResponse authResponse = new AuthResponse(jwtTokenService.issue(user), "Bearer", false,
                AuthUserResponse.from(user));
        when(googleOAuthService.login("mobile-id-token")).thenReturn(authResponse);

        mockMvc.perform(post("/api/v1/auth/mobile/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id_token\":\"mobile-id-token\"}"))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andExpect(jsonPath("$.access_token").isNotEmpty())
                .andExpect(jsonPath("$.refresh_token").isNotEmpty());
    }

    private MvcResult signUp(String email) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/mobile/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"password123",
                                 "name":"모바일","department":"컴퓨터공학과"}
                                """.formatted(email)))
                .andExpect(status().isCreated())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andReturn();
    }

    private MvcResult refresh(String token, int expectedStatus) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/mobile/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.createObjectNode()
                                .put("refresh_token", token).toString()))
                .andExpect(status().is(expectedStatus))
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andReturn();
    }

    private JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }
}
