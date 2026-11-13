package com.save.storage;

import com.save.common.BusinessException;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import javax.imageio.ImageIO;
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
    void acceptsDecodedPngAndUsesServerDetectedExtension() throws Exception {
        byte[] png = validPng();
        MockMultipartFile file = new MockMultipartFile(
                "photos", "profile.PNG", "image/png", png);

        ValidatedImage image = policy.validate(file);

        assertThat(image.extension()).isEqualTo("png");
        assertThat(image.contentType()).isEqualTo("image/png");
        assertThat(javax.imageio.ImageIO.read(new java.io.ByteArrayInputStream(image.bytes())).getWidth()).isEqualTo(1);
    }

    @Test
    void acceptsValidPngWhenAndroidOmitsFilename() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "photos", null, "image/png", validPng());

        ValidatedImage image = policy.validate(file);

        assertThat(image.extension()).isEqualTo("png");
        assertThat(image.contentType()).isEqualTo("image/png");
    }

    @Test
    void acceptsValidPngWhenAndroidOmitsContentType() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "photos", "camera.png", null, validPng());

        ValidatedImage image = policy.validate(file);

        assertThat(image.extension()).isEqualTo("png");
        assertThat(image.contentType()).isEqualTo("image/png");
    }

    @Test
    void acceptsValidJpegWithAndroidImageJpgContentType() throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 1, BufferedImage.TYPE_INT_RGB), "jpg", bytes);
        MockMultipartFile file = new MockMultipartFile(
                "photos", "camera.jpg", "image/jpg", bytes.toByteArray());

        ValidatedImage image = policy.validate(file);

        assertThat(image.extension()).isEqualTo("png");
        assertThat(image.contentType()).isEqualTo("image/png");
    }

    @Test
    void rejectsFilesOverConfiguredLimit() {
        MockMultipartFile file = new MockMultipartFile(
                "photos", "large.jpg", "image/jpeg", new byte[1025]);

        assertThatThrownBy(() -> policy.validate(file))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("크기");
    }

    private byte[] validPng() {
        return Base64.getDecoder().decode(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=");
    }
}
