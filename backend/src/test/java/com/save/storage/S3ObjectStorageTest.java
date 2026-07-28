package com.save.storage;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class S3ObjectStorageTest {

    @Test
    void storesValidatedBytesWithBucketKeyAndContentType() {
        S3Client client = mock(S3Client.class);
        StorageProperties properties = new StorageProperties();
        properties.getS3().setBucket("save-items");
        properties.getS3().setPublicBaseUrl("https://cdn.save.example");
        S3ObjectStorage storage = new S3ObjectStorage(properties, client);

        StoredObject result = storage.store(
                new ValidatedImage(new byte[]{1, 2, 3}, "png", "image/png"));

        ArgumentCaptor<PutObjectRequest> request = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(client).putObject(request.capture(), any(RequestBody.class));
        assertThat(request.getValue().bucket()).isEqualTo("save-items");
        assertThat(request.getValue().key()).isEqualTo(result.key());
        assertThat(request.getValue().contentType()).isEqualTo("image/png");
        assertThat(result.url()).startsWith("https://cdn.save.example/items/");
    }
}
