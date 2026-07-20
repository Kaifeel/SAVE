package com.save.item;

import com.save.common.BusinessException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PhotoStorageService {
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024;
    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "image/webp", "image/gif");
    private final Path uploadDirectory;

    public PhotoStorageService(@Value("${storage.upload-dir:uploads}") String uploadDir) {
        this.uploadDirectory = Path.of(uploadDir).toAbsolutePath().normalize();
    }

    public List<String> store(List<MultipartFile> photos) {
        if (photos == null || photos.isEmpty()) return List.of();
        if (photos.size() > 5) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "사진은 최대 5장까지 등록할 수 있습니다.");
        }
        try {
            Files.createDirectories(uploadDirectory);
            List<String> urls = new ArrayList<>();
            for (MultipartFile photo : photos) {
                if (photo == null || photo.isEmpty()) continue;
                validate(photo);
                String extension = extension(photo.getOriginalFilename());
                String filename = UUID.randomUUID() + extension;
                Path target = uploadDirectory.resolve(filename).normalize();
                if (!target.getParent().equals(uploadDirectory)) {
                    throw new BusinessException(HttpStatus.BAD_REQUEST, "올바르지 않은 파일 이름입니다.");
                }
                Files.copy(photo.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
                urls.add("/uploads/" + filename);
            }
            return urls;
        } catch (IOException exception) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "사진 저장에 실패했습니다.");
        }
    }

    public Path getUploadDirectory() { return uploadDirectory; }

    private void validate(MultipartFile photo) {
        if (photo.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "사진 한 장의 크기는 10MB 이하여야 합니다.");
        }
        if (!ALLOWED_TYPES.contains(photo.getContentType())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "JPG, PNG, WEBP, GIF 형식만 업로드할 수 있습니다.");
        }
    }

    private String extension(String originalFilename) {
        if (originalFilename == null) return "";
        int index = originalFilename.lastIndexOf('.');
        if (index < 0) return "";
        String extension = originalFilename.substring(index).toLowerCase();
        return extension.length() <= 6 ? extension : "";
    }
}
