package com.save.storage;

import com.save.item.ItemService;
import com.save.user.User;
import com.save.user.UserRepository;
import com.save.user.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"storage.upload-requests-per-window=2", "storage.upload-window-seconds=60"})
@AutoConfigureMockMvc
class UploadRateLimitIntegrationTest {
    @Autowired MockMvc mvc;
    @MockBean UserRepository users;
    @MockBean ItemService items;
    @MockBean com.save.user.UserService profiles;

    @BeforeEach void users() {
        User active = mock(User.class);
        when(active.getStatus()).thenReturn(UserStatus.ACTIVE);
        when(users.findById(anyInt())).thenReturn(Optional.of(active));
    }

    @Test void limitsBeforeControllerAndSeparatesUsers() throws Exception {
        for (int i = 0; i < 2; i++) {
            mvc.perform(multipart("/api/v1/items").file(photo()).with(jwt().jwt(j -> j.subject("8101"))))
                    .andExpect(status().isCreated());
        }
        mvc.perform(multipart("/api/v1/items").file(photo()).with(jwt().jwt(j -> j.subject("8101"))))
                .andExpect(status().isTooManyRequests()).andExpect(header().exists("Retry-After"));
        mvc.perform(multipart("/api/v1/items").file(photo()).with(jwt().jwt(j -> j.subject("8102"))))
                .andExpect(status().isCreated());
        verify(items, times(2)).create(eq(8101), any());
    }

    @Test void deniesUnauthenticatedUploads() throws Exception {
        mvc.perform(multipart("/api/v1/items").file(photo())).andExpect(status().isUnauthorized());
        verifyNoInteractions(items);
    }

    @Test void deniesSuspendedUsers() throws Exception {
        User suspended = mock(User.class);
        when(suspended.getStatus()).thenReturn(UserStatus.SUSPENDED);
        when(users.findById(8103)).thenReturn(Optional.of(suspended));
        mvc.perform(multipart("/api/v1/items").file(photo()).with(jwt().jwt(j -> j.subject("8103"))))
                .andExpect(status().isForbidden());
        verifyNoInteractions(items);
    }

    @Test void sharesLimitWithProfileUploadsAndCountsFailures() throws Exception {
        when(items.create(eq(8110), any())).thenThrow(new com.save.common.BusinessException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "invalid image"));
        for (int i = 0; i < 2; i++) {
            mvc.perform(multipart("/api/v1/items").file(photo()).with(jwt().jwt(j -> j.subject("8110"))))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(multipart("/api/v1/users/me/profile").file(photo())
                .with(request -> { request.setMethod("PUT"); return request; })
                .with(jwt().jwt(j -> j.subject("8110"))))
                .andExpect(status().isTooManyRequests());
        verifyNoInteractions(profiles);
    }
    private MockMultipartFile photo() {
        return new MockMultipartFile("photos", "a.png", "image/png", new byte[]{1});
    }
}
