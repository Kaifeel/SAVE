package com.save.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;

import com.save.user.User;
import com.save.user.UserRepository;
import jakarta.servlet.http.Cookie;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockCookie;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
class AuthRefreshIntegrationTest {

    private static final String ORIGIN = "http://localhost:5173";

    @Autowired MockMvc mockMvc;
    @Autowired RefreshTokenRepository refreshTokenRepository;
    @Autowired UserRepository userRepository;
    @Autowired JwtTokenService jwtTokenService;
    @Autowired GoogleLoginTicketService googleLoginTicketService;

    @BeforeEach
    @AfterEach
    void cleanUp() {
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void signupCookieRotatesAndRefreshReturnsLatestProfile() throws Exception {
        MvcResult signup = mockMvc.perform(post("/api/v1/auth/signup")
                        .header(HttpHeaders.ORIGIN, ORIGIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"refresh@pukyong.ac.kr","password":"password123",
                                 "name":"학생","department":"초기학과"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("SameSite=Lax")))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, containsString("no-store")))
                .andExpect(header().string(HttpHeaders.PRAGMA, "no-cache"))
                .andExpect(jsonPath("$.access_token").isNotEmpty())
                .andReturn();

        assertThat(signup.getResponse().getHeaders(HttpHeaders.SET_COOKIE)).hasSize(1);

        Cookie firstCookie = responseCookie(signup);
        assertThat(firstCookie).isNotNull();
        assertThat(firstCookie.isHttpOnly()).isTrue();
        assertThat(firstCookie.getSecure()).isFalse();
        assertThat(firstCookie.getPath()).isEqualTo("/api/v1/auth");
        assertThat(firstCookie.getAttribute("SameSite")).isEqualTo("Lax");
        assertThat(firstCookie.getValue()).isNotBlank();

        User user = userRepository.findByEmailIgnoreCase("refresh@pukyong.ac.kr").orElseThrow();
        user.updateProfile("학생", "수정된학과", null, null);
        userRepository.saveAndFlush(user);

        MvcResult refreshed = mockMvc.perform(post("/api/v1/auth/refresh")
                        .header(HttpHeaders.ORIGIN, ORIGIN)
                        .cookie(firstCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.access_token").isNotEmpty())
                .andExpect(jsonPath("$.user.department").value("수정된학과"))
                .andReturn();

        Cookie rotatedCookie = responseCookie(refreshed);
        assertThat(rotatedCookie).isNotNull();
        assertThat(rotatedCookie.getValue()).isNotEqualTo(firstCookie.getValue());

        MvcResult reused = mockMvc.perform(post("/api/v1/auth/refresh")
                        .header(HttpHeaders.ORIGIN, ORIGIN)
                        .cookie(firstCookie))
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertThat(responseCookie(reused).getMaxAge()).isZero();
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header(HttpHeaders.ORIGIN, ORIGIN)
                        .cookie(rotatedCookie))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logoutRevokesFamilyAndClearsCookie() throws Exception {
        MvcResult signup = mockMvc.perform(post("/api/v1/auth/signup")
                        .header(HttpHeaders.ORIGIN, ORIGIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"logout@pukyong.ac.kr","password":"password123",
                                 "name":"학생","department":"컴퓨터공학과"}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        Cookie cookie = responseCookie(signup);
        assertThat(cookie).isNotNull();

        MvcResult logout = mockMvc.perform(post("/api/v1/auth/logout")
                        .header(HttpHeaders.ORIGIN, ORIGIN)
                        .cookie(cookie))
                .andExpect(status().isNoContent())
                .andReturn();

        Cookie cleared = responseCookie(logout);
        assertThat(cleared).isNotNull();
        assertThat(cleared.getMaxAge()).isZero();
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header(HttpHeaders.ORIGIN, ORIGIN)
                        .cookie(cookie))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void googleExchangeStartsCookieSession() throws Exception {
        User user = userRepository.save(new User(
                "google@pukyong.ac.kr", "구글학생", null, null,
                "GOOGLE", "google-subject"));
        AuthResponse response = new AuthResponse(jwtTokenService.issue(user), "Bearer", false,
                AuthUserResponse.from(user));
        String code = googleLoginTicketService.issue(response);

        MvcResult exchange = mockMvc.perform(post("/api/v1/auth/google/exchange")
                        .header(HttpHeaders.ORIGIN, ORIGIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + code + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.access_token").isNotEmpty())
                .andReturn();

        Cookie cookie = responseCookie(exchange);
        assertThat(cookie).isNotNull();
        assertThat(cookie.isHttpOnly()).isTrue();
    }

    @Test
    void refreshRejectsUntrustedBrowserOrigin() throws Exception {
        MvcResult signup = mockMvc.perform(post("/api/v1/auth/signup")
                        .header(HttpHeaders.ORIGIN, ORIGIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"origin@pukyong.ac.kr","password":"password123",
                                 "name":"학생","department":"컴퓨터공학과"}
                                """))
                .andExpect(status().isCreated())
                .andReturn();

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header(HttpHeaders.ORIGIN, "https://attacker.example")
                        .cookie(responseCookie(signup)))
                .andExpect(status().isForbidden());
    }

    @Test
    void refreshRejectsMissingBrowserOrigin() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh"))
                .andExpect(status().isForbidden());
    }

    @Test
    void suspendedUserCannotRotateARefreshToken() throws Exception {
        MvcResult signup = mockMvc.perform(post("/api/v1/auth/signup")
                        .header(HttpHeaders.ORIGIN, ORIGIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"suspended-refresh@pukyong.ac.kr",
                                 "password":"password123","name":"정지 학생"}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        Cookie cookie = responseCookie(signup);
        User user = userRepository.findByEmailIgnoreCase(
                "suspended-refresh@pukyong.ac.kr").orElseThrow();
        user.sanction(LocalDateTime.now().plusDays(7), "테스트 정지");
        userRepository.saveAndFlush(user);

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header(HttpHeaders.ORIGIN, ORIGIN)
                        .cookie(cookie))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .header(HttpHeaders.ORIGIN, ORIGIN)
                        .cookie(cookie))
                .andExpect(status().isUnauthorized());
    }

    private Cookie responseCookie(MvcResult result) {
        return MockCookie.parse(result.getResponse().getHeader(HttpHeaders.SET_COOKIE));
    }
}
