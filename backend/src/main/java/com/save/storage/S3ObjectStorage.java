package com.save.storage;

import java.net.URI;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.S3Presigner.Builder;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

@Component
@Profile("prod")
public class S3ObjectStorage implements ObjectStorage {
    private final StorageProperties.S3 properties;
    private final S3Client client;
    private final S3Presigner presigner;

    @Autowired
    public S3ObjectStorage(StorageProperties properties) {
        this(properties, buildClient(properties.getS3()), buildPresigner(properties.getS3()));
    }

    S3ObjectStorage(StorageProperties properties, S3Client client, S3Presigner presigner) {
        this.properties = properties.getS3();
        this.client = client;
        this.presigner = presigner;
    }

    @Override
    public StoredObject store(ValidatedImage image) {
        return store(image, ObjectKeyFactory.itemImage(image.extension()));
    }

    @Override
    public StoredObject storeProfile(ValidatedImage image) {
        return store(image, ObjectKeyFactory.profileImage(image.extension()));
    }

    @Override
    public String readUrl(String storedUrl) {
        String key = objectKey(storedUrl);
        if (key == null) return storedUrl;
        GetObjectRequest get = GetObjectRequest.builder()
                .bucket(properties.getBucket())
                .key(key)
                .build();
        GetObjectPresignRequest request = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofHours(24))
                .getObjectRequest(get)
                .build();
        return presigner.presignGetObject(request).url().toString();
    }

    private StoredObject store(ValidatedImage image, String key) {
        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(properties.getBucket())
                .key(key)
                .contentType(image.contentType())
                .contentLength((long) image.bytes().length)
                .build();
        client.putObject(request, RequestBody.fromBytes(image.bytes()));
        return new StoredObject(key, publicUrl(key));
    }

    private String publicUrl(String key) {
        String base = properties.getPublicBaseUrl();
        if (base != null && !base.isBlank()) {
            return stripTrailingSlash(base) + "/" + key;
        }
        return "https://%s.s3.%s.amazonaws.com/%s".formatted(
                properties.getBucket(), properties.getRegion(), key);
    }

    private static S3Client buildClient(StorageProperties.S3 properties) {
        S3ClientBuilder builder = S3Client.builder()
                .region(Region.of(properties.getRegion()))
                .httpClientBuilder(UrlConnectionHttpClient.builder())
                .forcePathStyle(properties.isPathStyleAccessEnabled());
        if (properties.getEndpoint() != null && !properties.getEndpoint().isBlank()) {
            builder.endpointOverride(URI.create(properties.getEndpoint()));
        }
        if (properties.getAccessKey() != null && !properties.getAccessKey().isBlank()) {
            builder.credentialsProvider(StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(
                            properties.getAccessKey(), properties.getSecretKey())));
        }
        return builder.build();
    }

    private static S3Presigner buildPresigner(StorageProperties.S3 properties) {
        Builder builder = S3Presigner.builder().region(Region.of(properties.getRegion()));
        if (properties.getEndpoint() != null && !properties.getEndpoint().isBlank()) {
            builder.endpointOverride(URI.create(properties.getEndpoint()));
        }
        if (properties.getAccessKey() != null && !properties.getAccessKey().isBlank()) {
            builder.credentialsProvider(StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(
                            properties.getAccessKey(), properties.getSecretKey())));
        }
        return builder.build();
    }

    private String objectKey(String storedUrl) {
        if (storedUrl == null || storedUrl.isBlank()) return null;
        try {
            URI uri = URI.create(storedUrl);
            String expectedHost = "%s.s3.%s.amazonaws.com".formatted(
                    properties.getBucket(), properties.getRegion());
            if (!expectedHost.equalsIgnoreCase(uri.getHost())) return null;
            String path = uri.getPath();
            return path != null && path.length() > 1 ? path.substring(1) : null;
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private String stripTrailingSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
