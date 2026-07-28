package com.save.storage;

import java.net.URI;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Component
@Profile("prod")
public class S3ObjectStorage implements ObjectStorage {
    private final StorageProperties.S3 properties;
    private final S3Client client;

    public S3ObjectStorage(StorageProperties properties) {
        this(properties, buildClient(properties.getS3()));
    }

    S3ObjectStorage(StorageProperties properties, S3Client client) {
        this.properties = properties.getS3();
        this.client = client;
    }

    @Override
    public StoredObject store(ValidatedImage image) {
        String key = ObjectKeyFactory.itemImage(image.extension());
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

    private String stripTrailingSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
