package com.save.common;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GlobalExceptionHandlerTest {
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new TestController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void returnsBadRequestForInvalidRequestBody() throws Exception {
        mockMvc.perform(post("/test/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("이름은 필수입니다."))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    void returnsBadRequestForMalformedJson() throws Exception {
        mockMvc.perform(post("/test/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{invalid-json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("요청 형식이 올바르지 않습니다."));
    }

    @Test
    void returnsBadRequestForMissingOrInvalidRequestParameter() throws Exception {
        mockMvc.perform(get("/test/parameter"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("요청 파라미터가 올바르지 않습니다."));

        mockMvc.perform(get("/test/parameter").param("value", "not-a-number"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("요청 파라미터가 올바르지 않습니다."));
    }

    @Test
    void hidesUnexpectedExceptionDetailsFromClient() throws Exception {
        mockMvc.perform(get("/test/unexpected"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("서버 오류가 발생했습니다."))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("sensitive-detail"))));
    }

    @Test
    void preservesNotFoundStatusForMissingResource() throws Exception {
        mockMvc.perform(get("/test/not-found"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("요청한 리소스를 찾을 수 없습니다."));
    }

    @Test
    void returnsPayloadTooLargeWithoutExposingContainerDetails() throws Exception {
        mockMvc.perform(get("/test/upload-too-large"))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.message")
                        .value("업로드한 사진의 전체 크기가 허용 범위를 초과했습니다."));
    }

    @RestController
    static class TestController {
        @PostMapping("/test/validate")
        void validate(@Valid @RequestBody TestRequest request) {
        }

        @GetMapping("/test/parameter")
        void parameter(@RequestParam("value") Integer value) {
        }

        @GetMapping("/test/unexpected")
        void unexpected() {
            throw new IllegalStateException("sensitive-detail");
        }

        @GetMapping("/test/not-found")
        void notFound() throws NoResourceFoundException {
            throw new NoResourceFoundException(HttpMethod.GET, "/missing");
        }

        @GetMapping("/test/upload-too-large")
        void uploadTooLarge() {
            throw new MaxUploadSizeExceededException(1);
        }
    }

    record TestRequest(@NotBlank(message = "이름은 필수입니다.") String name) {
    }
}
