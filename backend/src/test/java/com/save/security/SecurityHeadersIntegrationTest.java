package com.save.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class SecurityHeadersIntegrationTest {
    @Autowired MockMvc mockMvc;

    @Test
    void apiResponsesSetBrowserSecurityHeaders() throws Exception {
        mockMvc.perform(get("/api/v1/universities"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string(
                        "Referrer-Policy", "strict-origin-when-cross-origin"))
                .andExpect(header().string(
                        "Permissions-Policy", "camera=(), microphone=(), geolocation=()"));
    }
}
