package com.save.storage;

import java.net.URI;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class S3ObjectStorageTest {

    @Test
    void productionComponentSelectsThePropertiesConstructor() {
        try (var context = new AnnotationConfigApplicationContext()) {
            context.getEnvironment().setActiveProfiles("prod");
            context.register(StorageProperties.class, S3ObjectStorage.class);

            assertThatCode(context::refresh).doesNotThrowAnyException();
            assertThat(context.getBean(ObjectStorage.class)).isInstanceOf(S3ObjectStorage.class);
        }
    }

    @Test
    void storesValidatedBytesWithBucketKeyAndContentType() {
        S3Client client = mock(S3Client.class);
        StorageProperties properties = new StorageProperties();
        properties.getS3().setBucket("save-items");
        properties.getS3().setPublicBaseUrl("https://cdn.save.example");
        S3ObjectStorage storage = new S3ObjectStorage(properties, client, mock(S3Presigner.class));

        StoredObject result = storage.store(
                new ValidatedImage(new byte[]{1, 2, 3}, "png", "image/png"));

        ArgumentCaptor<PutObjectRequest> request = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(client).putObject(request.capture(), any(RequestBody.class));
        assertThat(request.getValue().bucket()).isEqualTo("save-items");
        assertThat(request.getValue().key()).isEqualTo(result.key());
        assertThat(request.getValue().contentType()).isEqualTo("image/png");
        assertThat(result.url()).startsWith("https://cdn.save.example/items/");
    }

    @Test
    void storesProfileImagesUnderProfilePrefix() {
        S3Client client = mock(S3Client.class);
        StorageProperties properties = new StorageProperties();
        properties.getS3().setBucket("save-items");
        properties.getS3().setPublicBaseUrl("https://cdn.save.example");
        S3ObjectStorage storage = new S3ObjectStorage(properties, client, mock(S3Presigner.class));

        StoredObject result = storage.storeProfile(
                new ValidatedImage(new byte[]{1, 2, 3}, "png", "image/png"));

        ArgumentCaptor<PutObjectRequest> request = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(client).putObject(request.capture(), any(RequestBody.class));
        assertThat(request.getValue().key()).startsWith("profiles/");
        assertThat(result.url()).startsWith("https://cdn.save.example/profiles/");
    }

    @Test
    void signsConfiguredBucketObjectForExactlyTwentyFourHours() throws Exception {
        S3Client client = mock(S3Client.class);
        S3Presigner presigner = mock(S3Presigner.class);
        PresignedGetObjectRequest signed = mock(PresignedGetObjectRequest.class);
        when(signed.url()).thenReturn(URI.create("https://signed.example/items/photo.jpg?signature=ok").toURL());
        when(presigner.presignGetObject(any(GetObjectPresignRequest.class))).thenReturn(signed);
        StorageProperties properties = new StorageProperties();
        properties.getS3().setBucket("save-items");
        properties.getS3().setRegion("ap-northeast-2");
        S3ObjectStorage storage = new S3ObjectStorage(properties, client, presigner);

        String result = storage.readUrl(
                "https://save-items.s3.ap-northeast-2.amazonaws.com/items/photo.jpg");

        ArgumentCaptor<GetObjectPresignRequest> request =
                ArgumentCaptor.forClass(GetObjectPresignRequest.class);
        verify(presigner).presignGetObject(request.capture());
        assertThat(request.getValue().signatureDuration()).isEqualTo(Duration.ofHours(24));
        assertThat(request.getValue().getObjectRequest().bucket()).isEqualTo("save-items");
        assertThat(request.getValue().getObjectRequest().key()).isEqualTo("items/photo.jpg");
        assertThat(result).isEqualTo("https://signed.example/items/photo.jpg?signature=ok");
    }

    @Test
    void doesNotSignAUrlFromAnotherHost() {
        S3Presigner presigner = mock(S3Presigner.class);
        StorageProperties properties = new StorageProperties();
        properties.getS3().setBucket("save-items");
        properties.getS3().setRegion("ap-northeast-2");
        S3ObjectStorage storage = new S3ObjectStorage(properties, mock(S3Client.class), presigner);
        String foreign = "https://attacker.example/items/photo.jpg";

        assertThat(storage.readUrl(foreign)).isEqualTo(foreign);
        verify(presigner, never()).presignGetObject(any(GetObjectPresignRequest.class));
    }
}
