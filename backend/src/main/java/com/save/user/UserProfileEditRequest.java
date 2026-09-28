package com.save.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.multipart.MultipartFile;

public record UserProfileEditRequest(
        @NotBlank @Size(max = 50) String name,
        MultipartFile photo) {}
