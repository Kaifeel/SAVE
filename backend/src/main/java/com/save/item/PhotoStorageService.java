package com.save.item;

import com.save.common.BusinessException;
import com.save.storage.LocalObjectStorage;
import com.save.storage.ObjectStorage;
import com.save.storage.StoredObject;
import com.save.storage.UploadPolicy;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PhotoStorageService {
    private final UploadPolicy uploadPolicy;
    private final ObjectStorage objectStorage;

    public PhotoStorageService(UploadPolicy uploadPolicy, ObjectStorage objectStorage) {
        this.uploadPolicy = uploadPolicy;
        this.objectStorage = objectStorage;
    }

    public List<String> store(List<MultipartFile> photos) {
        if (photos == null || photos.isEmpty()) return List.of();
        if (photos.size() > uploadPolicy.maxFiles()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST,
                    "사진은 최대 " + uploadPolicy.maxFiles() + "장까지 등록할 수 있습니다.");
        }
        List<String> urls = new ArrayList<>();
        for (MultipartFile photo : photos) {
            if (photo == null || photo.isEmpty()) continue;
            StoredObject stored = objectStorage.store(uploadPolicy.validate(photo));
            urls.add(stored.url());
        }
        return urls;
    }

    public Path getUploadDirectory() {
        return objectStorage instanceof LocalObjectStorage local ? local.root() : null;
    }
}
