package com.save.storage;

import com.save.common.BusinessException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
@Profile("!prod")
public class LocalObjectStorage implements ObjectStorage {
    private final Path root;
    private final String publicBaseUrl;

    public LocalObjectStorage(StorageProperties properties) {
        this.root = Path.of(properties.getLocalRoot()).toAbsolutePath().normalize();
        this.publicBaseUrl = stripTrailingSlash(properties.getPublicBaseUrl());
    }

    @Override
    public StoredObject store(ValidatedImage image) {
        String key = ObjectKeyFactory.itemImage(image.extension());
        Path target = root.resolve(key).normalize();
        if (!target.startsWith(root)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "올바르지 않은 저장 경로입니다.");
        }
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, image.bytes());
            return new StoredObject(key, publicBaseUrl + "/" + key);
        } catch (IOException exception) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "사진 저장에 실패했습니다.");
        }
    }

    public Path root() {
        return root;
    }

    private String stripTrailingSlash(String value) {
        if (value == null || value.isBlank()) return "/uploads";
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
