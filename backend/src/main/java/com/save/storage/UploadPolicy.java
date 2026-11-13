package com.save.storage;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.util.concurrent.Semaphore;
import javax.imageio.stream.MemoryCacheImageInputStream;
import javax.imageio.stream.MemoryCacheImageOutputStream;
import com.save.common.BusinessException;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Locale;
import javax.imageio.ImageIO;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class UploadPolicy {
    private final StorageProperties properties;
    private final Semaphore processing;

    public UploadPolicy(StorageProperties properties) {
        if (properties.getMaxWidth() <= 0 || properties.getMaxHeight() <= 0
                || properties.getMaxPixels() <= 0 || properties.getMaxConcurrentImages() <= 0
                || properties.getMaxFileSize() <= 0 || properties.getMaxFiles() <= 0) {
            throw new IllegalArgumentException("Image limits must be positive");
        }
        this.properties = properties;
        this.processing = new Semaphore(properties.getMaxConcurrentImages());
    }

    public ValidatedImage validate(MultipartFile file) {
        if (!processing.tryAcquire()) {
            throw new BusinessException(HttpStatus.TOO_MANY_REQUESTS,
                    "이미지를 처리 중입니다. 잠시 후 다시 시도해 주세요.");
        }
        try {
            return sanitize(file);
        } finally {
            processing.release();
        }
    }

    private ValidatedImage sanitize(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw invalidImage();
        }
        if (file.getSize() > properties.getMaxFileSize()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST,
                    "이미지 한 장의 크기가 허용 범위를 초과했습니다.");
        }

        try {
            byte[] bytes = file.getBytes();
            String detectedExtension = detect(bytes);
            if (detectedExtension == null) throw invalidImage();
            return decodeAndRewrite(bytes, detectedExtension);
        } catch (BusinessException exception) {
            throw exception;
        } catch (IOException | RuntimeException exception) {
            throw invalidImage();
        }
    }

    private ValidatedImage decodeAndRewrite(byte[] bytes, String format) throws IOException {
        // Memory-only streams avoid ImageIO's process-wide disk-cache setting.
        try (var input = new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw invalidImage();
            var reader = readers.next();
            BufferedImage decoded = null;
            BufferedImage clean = null;
            try {
                reader.addIIOReadWarningListener((source, warning) -> { throw invalidImage(); });
                reader.setInput(input, true, true);
                if (!canonical(reader.getFormatName().toLowerCase(Locale.ROOT)).equals(format)) throw invalidImage();
                requireDimensions(reader.getWidth(0), reader.getHeight(0));
                // Only the first frame is supported: no animation or frame metadata is retained.
                decoded = reader.read(0);
                if (decoded == null) throw invalidImage();
                requireDimensions(decoded.getWidth(), decoded.getHeight());
                int orientation = ImageOrientation.read(bytes, format);
                boolean swap = orientation >= 5;
                int width = decoded.getWidth(), height = decoded.getHeight();
                requireDimensions(swap ? height : width, swap ? width : height);
                clean = new BufferedImage(swap ? height : width, swap ? width : height,
                        BufferedImage.TYPE_INT_ARGB);
                for (int y = 0; y < height; y++) {
                    for (int x = 0; x < width; x++) {
                        int dx = switch (orientation) {
                            case 2, 3 -> width - 1 - x;
                            case 5, 8 -> y;
                            case 6, 7 -> height - 1 - y;
                            default -> x;
                        };
                        int dy = switch (orientation) {
                            case 3, 4 -> height - 1 - y;
                            case 5, 6 -> x;
                            case 7, 8 -> width - 1 - x;
                            default -> y;
                        };
                        clean.setRGB(dx, dy, decoded.getRGB(x, y));
                    }
                }
                var buffer = new ByteArrayOutputStream();
                var bounded = new OutputStream() {
                    private long written;
                    @Override public void write(int value) throws IOException {
                        check(1); buffer.write(value);
                    }
                    @Override public void write(byte[] data, int offset, int length) throws IOException {
                        check(length); buffer.write(data, offset, length);
                    }
                    private void check(int length) throws IOException {
                        if (length > properties.getMaxFileSize() - written) {
                            throw new IOException("Encoded image exceeds output limit");
                        }
                        written += length;
                    }
                };
                try (var output = new MemoryCacheImageOutputStream(bounded)) {
                    if (!ImageIO.write(clean, "png", output)) throw new IOException("PNG writer unavailable");
                }
                return new ValidatedImage(buffer.toByteArray(), "png", "image/png");
            } finally {
                reader.dispose();
                if (decoded != null) decoded.flush();
                if (clean != null) clean.flush();
            }
        }
    }

    private void requireDimensions(int width, int height) {
        if (width <= 0 || height <= 0 || width > properties.getMaxWidth()
                || height > properties.getMaxHeight() || (long) width * height > properties.getMaxPixels()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "이미지 해상도가 허용 범위를 초과했습니다.");
        }
    }
    public int maxFiles() {
        return properties.getMaxFiles();
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
