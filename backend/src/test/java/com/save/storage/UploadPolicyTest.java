package com.save.storage;

import com.save.common.BusinessException;
import java.util.Base64;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static java.nio.charset.StandardCharsets.UTF_8;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UploadPolicyTest {
    private UploadPolicy policy;

    @BeforeEach
    void setUp() {
        StorageProperties properties = new StorageProperties();
        properties.setMaxFileSize(1024);
        policy = new UploadPolicy(properties);
    }

    @Test
    void rejectsExtensionMimeAndSignatureMismatch() {
        MockMultipartFile file = new MockMultipartFile(
                "photos", "../avatar.png", "image/png", "not-a-png".getBytes(UTF_8));

        assertThatThrownBy(() -> policy.validate(file))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("이미지");
    }

    @Test
    void acceptsDecodedPngAndUsesServerDetectedExtension() {
        byte[] png = Base64.getDecoder().decode(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=");
        MockMultipartFile file = new MockMultipartFile(
                "photos", "profile.PNG", "image/png", png);

        ValidatedImage image = policy.validate(file);

        assertThat(image.extension()).isEqualTo("png");
        assertThat(image.contentType()).isEqualTo("image/png");
        assertThat(image.bytes()).isEqualTo(png);
    }

    @Test
    void rejectsFilesOverConfiguredLimit() {
        MockMultipartFile file = new MockMultipartFile(
                "photos", "large.jpg", "image/jpeg", new byte[1025]);

        assertThatThrownBy(() -> policy.validate(file))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("크기");
    }
}
