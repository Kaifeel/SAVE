package com.save.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.save.user.User;
import com.save.user.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = "auth.signup.enabled=false")
@AutoConfigureMockMvc
class SignupDisabledIntegrationTest {

    @Autowired MockMvc mockMvc;
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
    void disabledSignupRejectsWebAndMobileWhileKeepingLoginAvailable() throws Exception {
        String signupBody = """
                {"email":"new@pukyong.ac.kr","password":"password123",
                 "name":"신규 사용자","department":"컴퓨터공학과"}
                """;

        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON).content(signupBody))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("회원가입이 비활성화되어 있습니다."));

        mockMvc.perform(post("/api/v1/auth/mobile/signup")
                        .contentType(MediaType.APPLICATION_JSON).content(signupBody))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("회원가입이 비활성화되어 있습니다."));

        userRepository.save(User.local("demo@pukyong.ac.kr",
                passwordEncoder.encode("password123"), "데모 사용자", "컴퓨터공학과"));

        mockMvc.perform(post("/api/v1/auth/mobile/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"demo@pukyong.ac.kr","password":"password123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.access_token").isNotEmpty());
    }
}
