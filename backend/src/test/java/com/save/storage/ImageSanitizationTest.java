package com.save.storage;

import com.save.common.BusinessException;
import java.awt.image.BufferedImage;
import java.io.*;
import java.util.Base64;
import java.util.zip.CRC32;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import static java.nio.charset.StandardCharsets.*;
import static org.assertj.core.api.Assertions.*;

class ImageSanitizationTest {
    private final UploadPolicy policy = new UploadPolicy(new StorageProperties());

    @Test void rejectsFakeWebpEvenWithMatchingSignature() {
        assertThatThrownBy(() -> policy.validate(file("webp", "RIFFxxxxWEBPgarbage".getBytes(US_ASCII))))
                .isInstanceOf(BusinessException.class);
    }

    @Test void removesPngMetadataAndTrailingBytesButPreservesPixels() throws Exception {
        byte[] original = png(2, 3);
        var bytes = new ByteArrayOutputStream();
        bytes.write(original, 0, 33);
        var data = new DataOutputStream(bytes);
        byte[] text = "Comment\0GPS-secret-camera-info".getBytes(UTF_8);
        data.writeInt(text.length);
        byte[] type = "tEXt".getBytes(US_ASCII);
        data.write(type); data.write(text);
        CRC32 crc = new CRC32(); crc.update(type); crc.update(text); data.writeInt((int) crc.getValue());
        bytes.write(original, 33, original.length - 33);
        bytes.write("TRAILING-PRIVATE-DATA".getBytes(US_ASCII));
        ValidatedImage result = policy.validate(file("png", bytes.toByteArray()));
        assertThat(new String(result.bytes(), ISO_8859_1)).doesNotContain("GPS-secret", "TRAILING-PRIVATE-DATA");
        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(result.bytes()));
        assertThat(decoded.getWidth()).isEqualTo(2);
        assertThat(decoded.getHeight()).isEqualTo(3);
        assertThat(decoded.getRGB(0, 0)).isEqualTo(0x8066aaff);
    }

    @Test void rejectsWidthBeyondLimit() throws Exception {
        assertThatThrownBy(() -> policy.validate(file("png", png(8001, 1))))
                .isInstanceOf(BusinessException.class).hasMessageContaining("해상도");
    }

    @Test void rejectsHeightBeyondLimit() throws Exception {
        assertThatThrownBy(() -> policy.validate(file("png", png(1, 8001))))
                .isInstanceOf(BusinessException.class).hasMessageContaining("해상도");
    }

    @Test void rejectsPixelBombFromHeaderBeforeDecode() throws Exception {
        byte[] original = png(1, 1);
        java.nio.ByteBuffer header = java.nio.ByteBuffer.wrap(original);
        header.putInt(16, 5000); header.putInt(20, 5000);
        CRC32 crc = new CRC32(); crc.update(original, 12, 17); header.putInt(29, (int) crc.getValue());
        assertThatThrownBy(() -> policy.validate(file("png", original)))
                .isInstanceOf(BusinessException.class).hasMessageContaining("해상도");
    }

    @Test void convertsJpegAndGifToFreshPng() throws Exception {
        for (String format : new String[]{"jpg", "gif"}) {
            var bytes = new ByteArrayOutputStream();
            ImageIO.write(new BufferedImage(3, 2, BufferedImage.TYPE_INT_RGB), format, bytes);
            var result = policy.validate(file(format, bytes.toByteArray()));
            assertThat(result.extension()).isEqualTo("png");
            assertThat(result.contentType()).isEqualTo("image/png");
            assertThat(ImageIO.read(new ByteArrayInputStream(result.bytes())).getWidth()).isEqualTo(3);
        }
    }

    @Test void decodesRealWebpAndPreservesTransparency() throws Exception {
        // Locally generated 2x3 lossless RGBA WebP, no external fixture dependency.
        byte[] webp = Base64.getDecoder().decode("UklGRh4AAABXRUJQVlA4TBEAAAAvAYAAEAdQiirUo4CBiOh/AAA=");
        var result = policy.validate(file("webp", webp));
        assertThat(result.extension()).isEqualTo("png");
        var decoded = ImageIO.read(new ByteArrayInputStream(result.bytes()));
        assertThat(decoded.getWidth()).isEqualTo(2);
        assertThat(decoded.getHeight()).isEqualTo(3);
        assertThat(decoded.getRGB(0, 0)).isEqualTo(0x800a141e);
    }

    @Test void appliesExifOrientationBeforeRemovingMetadata() throws Exception {
        var original = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 3, BufferedImage.TYPE_INT_RGB), "jpg", original);
        var bytes = new ByteArrayOutputStream();
        bytes.write(original.toByteArray(), 0, 2);
        var data = new DataOutputStream(bytes);
        data.writeShort(0xffe1); data.writeShort(34); data.write(new byte[]{69,120,105,102,0,0});
        var tiff = java.nio.ByteBuffer.allocate(26).order(java.nio.ByteOrder.LITTLE_ENDIAN);
        tiff.put((byte)73).put((byte)73).putShort((short)42).putInt(8).putShort((short)1);
        tiff.putShort((short)0x112).putShort((short)3).putInt(1).putShort((short)6).putShort((short)0).putInt(0);
        data.write(tiff.array());
        bytes.write(original.toByteArray(), 2, original.size() - 2);
        var result = policy.validate(file("jpg", bytes.toByteArray()));
        var decoded = ImageIO.read(new ByteArrayInputStream(result.bytes()));
        assertThat(decoded.getWidth()).isEqualTo(3);
        assertThat(decoded.getHeight()).isEqualTo(2);
        assertThat(new String(result.bytes(), ISO_8859_1)).doesNotContain("Exif");
    }

    @Test void acceptsExactDimensionAndPixelLimitAndRejectsOnePixelOver() throws Exception {
        var config = new StorageProperties();
        config.setMaxWidth(4); config.setMaxHeight(3); config.setMaxPixels(12);
        var limited = new UploadPolicy(config);
        assertThat(limited.validate(file("png", png(4, 3)))).isNotNull();
        config.setMaxPixels(11);
        assertThatThrownBy(() -> limited.validate(file("png", png(4, 3))))
                .isInstanceOf(BusinessException.class).hasMessageContaining("해상도");
    }

    @Test void rejectsReencodedOutputExceedingLimit() throws Exception {
        byte[] gif = Base64.getDecoder().decode("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
        var config = new StorageProperties(); config.setMaxFileSize(gif.length);
        assertThatThrownBy(() -> new UploadPolicy(config).validate(file("gif", gif)))
                .isInstanceOf(BusinessException.class);
    }

    @Test void localStorageReceivesOnlySanitizedBytes(@org.junit.jupiter.api.io.TempDir java.nio.file.Path root) throws Exception {
        var original = new ByteArrayOutputStream(); original.write(png(2, 2));
        original.write("PRIVATE-TRAILER".getBytes(US_ASCII));
        var config = new StorageProperties(); config.setLocalRoot(root.toString());
        var service = new com.save.item.PhotoStorageService(policy, new LocalObjectStorage(config));
        service.store(java.util.List.of(file("png", original.toByteArray())));
        try (var paths = java.nio.file.Files.walk(root)) {
            var stored = paths.filter(java.nio.file.Files::isRegularFile).findFirst().orElseThrow();
            byte[] bytes = java.nio.file.Files.readAllBytes(stored);
            assertThat(new String(bytes, ISO_8859_1)).doesNotContain("PRIVATE-TRAILER");
            assertThat(ImageIO.read(new ByteArrayInputStream(bytes))).isNotNull();
        }
    }
    @Test void rejectsTruncatedJpegRatherThanSavingDecoderRecovery() throws Exception {
        var bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), "jpg", bytes);
        byte[] truncated = java.util.Arrays.copyOf(bytes.toByteArray(), bytes.size() - 2);
        assertThatThrownBy(() -> policy.validate(file("jpg", truncated)))
                .isInstanceOf(BusinessException.class);
    }

    @Test void boundsConcurrentDecodingAndReleasesPermitAfterFailure() throws Exception {
        var entered = new java.util.concurrent.CountDownLatch(1);
        var release = new java.util.concurrent.CountDownLatch(1);
        var blocking = new MockMultipartFile("photos", "bad.png", "image/png", new byte[]{1}) {
            @Override public byte[] getBytes() {
                entered.countDown();
                try {
                    if (!release.await(5, java.util.concurrent.TimeUnit.SECONDS)) throw new IllegalStateException("test timeout");
                } catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); throw new IllegalStateException(interrupted); }
                return new byte[]{1};
            }
        };
        var executor = java.util.concurrent.Executors.newSingleThreadExecutor();
        try {
            var first = executor.submit(() -> assertThatThrownBy(() -> policy.validate(blocking)).isInstanceOf(BusinessException.class));
            assertThat(entered.await(5, java.util.concurrent.TimeUnit.SECONDS)).isTrue();
            assertThatThrownBy(() -> policy.validate(file("png", png(1, 1))))
                    .isInstanceOfSatisfying(BusinessException.class, e -> assertThat(e.getStatus().value()).isEqualTo(429));
            release.countDown(); first.get(5, java.util.concurrent.TimeUnit.SECONDS);
            assertThat(policy.validate(file("png", png(1, 1)))).isNotNull();
        } finally { release.countDown(); executor.shutdownNow(); }
    }
    static byte[] png(int width, int height) throws IOException {
        var image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        image.setRGB(0, 0, 0x8066aaff);
        var out = new ByteArrayOutputStream(); ImageIO.write(image, "png", out); return out.toByteArray();
    }

    static MockMultipartFile file(String format, byte[] bytes) {
        return new MockMultipartFile("photos", "photo." + format,
                "image/" + (format.equals("jpg") ? "jpeg" : format), bytes);
    }
}
