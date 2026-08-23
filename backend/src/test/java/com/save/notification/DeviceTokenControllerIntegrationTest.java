package com.save.notification;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.save.user.User;
import com.save.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class DeviceTokenControllerIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired UserDeviceTokenRepository tokenRepository;

    @Test
    void validatesExpoTokenFormatAndLength() throws Exception {
        User user = userRepository.save(new User("토큰 사용자"));

        register(user, "ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]", "ANDROID", 204);
        register(user, "ExponentPushToken[yyyyyyyyyyyyyyyyyyyyyy]", "IOS", 204);
        register(user, "fcm-token", "ANDROID", 400);
        register(user, "", "ANDROID", 400);
        register(user, "ExpoPushToken[" + "x".repeat(500) + "]", "ANDROID", 400);
    }

    @Test
    void registrationTransfersOwnershipAndAnotherUserCannotDeleteIt() throws Exception {
        User first = userRepository.save(new User("첫 사용자"));
        User second = userRepository.save(new User("둘째 사용자"));
        String token = "ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]";

        register(first, token, "IOS", 204);
        register(second, token, "ANDROID", 204);

        UserDeviceToken transferred = tokenRepository.findByToken(token).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(transferred.getUser().getId())
                .isEqualTo(second.getId());
        org.assertj.core.api.Assertions.assertThat(transferred.getPlatform())
                .isEqualTo(DevicePlatform.ANDROID);

        mockMvc.perform(delete("/api/v1/device-tokens")
                        .with(jwt().jwt(jwt -> jwt.subject(first.getId().toString())))
                        .param("token", token))
                .andExpect(status().isForbidden());
        org.assertj.core.api.Assertions.assertThat(
                tokenRepository.findByToken(token).orElseThrow().isEnabled()).isTrue();
    }

    private void register(User user, String token, String platform, int expectedStatus)
            throws Exception {
        mockMvc.perform(put("/api/v1/device-tokens")
                        .with(jwt().jwt(jwt -> jwt.subject(user.getId().toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + token + "\",\"platform\":\""
                                + platform + "\"}"))
                .andExpect(status().is(expectedStatus));
    }
}
