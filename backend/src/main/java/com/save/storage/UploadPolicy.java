package com.save.storage;

import com.save.common.BusinessException;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Locale;
import java.util.Map;
import javax.imageio.ImageIO;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class UploadPolicy {
    private static final Map<String, String> MIME_BY_EXTENSION = Map.of(
            "jpg", "image/jpeg",
            "jpeg", "image/jpeg",
            "png", "image/png",
            "gif", "image/gif",
            "webp", "image/webp");

    private final StorageProperties properties;

    public UploadPolicy(StorageProperties properties) {
        this.properties = properties;
    }

    public ValidatedImage validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw invalidImage();
        }
        if (file.getSize() > properties.getMaxFileSize()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST,
                    "이미지 한 장의 크기가 허용 범위를 초과했습니다.");
        }

        String extension = extension(file.getOriginalFilename());
        String declaredMime = file.getContentType();
        String expectedMime = MIME_BY_EXTENSION.get(extension);
        if (expectedMime == null || !expectedMime.equals(declaredMime)) {
            throw invalidImage();
        }

        try {
            byte[] bytes = file.getBytes();
            String detectedExtension = detect(bytes);
            if (detectedExtension == null
                    || !canonical(extension).equals(canonical(detectedExtension))
                    || (!"webp".equals(detectedExtension)
                    && ImageIO.read(new ByteArrayInputStream(bytes)) == null)) {
                throw invalidImage();
            }
            return new ValidatedImage(bytes, canonical(detectedExtension), expectedMime);
        } catch (IOException exception) {
            throw invalidImage();
        }
    }

    public int maxFiles() {
        return properties.getMaxFiles();
    }

    private String extension(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        return dot < 0 ? "" : filename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private String canonical(String extension) {
        return "jpeg".equals(extension) ? "jpg" : extension;
    }

    private String detect(byte[] bytes) {
        if (startsWith(bytes, 0xFF, 0xD8, 0xFF)) return "jpg";
        if (startsWith(bytes, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)) return "png";
        if (ascii(bytes, 0, "GIF87a") || ascii(bytes, 0, "GIF89a")) return "gif";
        if (ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP")) return "webp";
        return null;
    }

    private boolean startsWith(byte[] bytes, int... signature) {
        if (bytes.length < signature.length) return false;
        for (int index = 0; index < signature.length; index++) {
            if ((bytes[index] & 0xFF) != signature[index]) return false;
        }
        return true;
    }

    private boolean ascii(byte[] bytes, int offset, String value) {
        if (bytes.length < offset + value.length()) return false;
        for (int index = 0; index < value.length(); index++) {
            if (bytes[offset + index] != (byte) value.charAt(index)) return false;
        }
        return true;
    }

    private BusinessException invalidImage() {
        return new BusinessException(HttpStatus.BAD_REQUEST,
                "유효한 JPG, PNG, WEBP 또는 GIF 이미지 파일만 업로드할 수 있습니다.");
    }
}
