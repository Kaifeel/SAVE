package com.save.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.save.university.University;
import com.save.university.UniversityRepository;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = "storage.local-root=build/test-profile-uploads")
@AutoConfigureMockMvc
class UserProfileEditIntegrationTest {
    private static final Path UPLOAD_ROOT = Path.of("build/test-profile-uploads")
            .toAbsolutePath().normalize();

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UniversityRepository universityRepository;

    private Integer universityId;

    @BeforeEach
    void setUpUniversity() {
        University university = universityRepository.findByName("부경대학교")
                .orElseGet(() -> universityRepository.save(new University("부경대학교")));
        universityId = university.getId();
    }

    @AfterEach
    void deleteTestUploads() throws Exception {
        if (!Files.exists(UPLOAD_ROOT)) return;
        try (var paths = Files.walk(UPLOAD_ROOT)) {
            paths.sorted(java.util.Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (java.io.IOException exception) {
                    throw new java.io.UncheckedIOException(exception);
                }
            });
        }
    }

    @Test
    void replacesProfilePhotoAndRemovesPreviousLocalFile() throws Exception {
        JsonNode signup = signUp("profile-edit@pukyong.ac.kr", "기존이름");
        String authorization = "Bearer " + signup.get("access_token").asText();

        String firstUrl = updateProfile(authorization, "첫이름", "first.png");
        assertThat(firstUrl).startsWith("/uploads/profiles/");
        Path firstFile = localPath(firstUrl);
        assertThat(firstFile).exists();

        String secondUrl = updateProfile(authorization, "새이름", "second.png");
        assertThat(secondUrl).startsWith("/uploads/profiles/").isNotEqualTo(firstUrl);
        assertThat(firstFile).doesNotExist();
        assertThat(localPath(secondUrl)).exists();

        mockMvc.perform(multipart(HttpMethod.PUT, "/api/v1/users/me/profile")
                        .param("name", "이름만변경")
                        .header("Authorization", authorization))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("이름만변경"))
                .andExpect(jsonPath("$.profile_image_url").value(secondUrl));
    }

    @Test
    void rejectsBlankProfileName() throws Exception {
        JsonNode signup = signUp("profile-blank@pukyong.ac.kr", "기존이름");

        mockMvc.perform(multipart(HttpMethod.PUT, "/api/v1/users/me/profile")
                        .param("name", " ")
                        .header("Authorization", "Bearer "
                                + signup.get("access_token").asText()))
                .andExpect(status().isBadRequest());
    }

    private String updateProfile(String authorization, String name, String filename)
            throws Exception {
        byte[] png = Base64.getDecoder().decode(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=");
        var photo = new MockMultipartFile("photo", filename, "image/png", png);
        MvcResult result = mockMvc.perform(multipart(HttpMethod.PUT,
                        "/api/v1/users/me/profile")
                        .file(photo).param("name", name)
                        .header("Authorization", authorization))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value(name))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("profile_image_url").asText();
    }

    private JsonNode signUp(String email, String name) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"password123\"," 
                                + "\"name\":\"" + name + "\",\"department\":\"컴퓨터공학과\"," 
                                + "\"university_id\":" + universityId + "}"))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private Path localPath(String publicUrl) {
        return UPLOAD_ROOT.resolve(publicUrl.substring("/uploads/".length())).normalize();
    }
}
