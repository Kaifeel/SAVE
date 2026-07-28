package com.save.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "storage")
public class StorageProperties {
    private String localRoot = "uploads";
    private String publicBaseUrl = "/uploads";
    private long maxFileSize = 10 * 1024 * 1024;
    private int maxFiles = 5;
    private final S3 s3 = new S3();

    public String getLocalRoot() { return localRoot; }
    public void setLocalRoot(String localRoot) { this.localRoot = localRoot; }
    public String getPublicBaseUrl() { return publicBaseUrl; }
    public void setPublicBaseUrl(String publicBaseUrl) { this.publicBaseUrl = publicBaseUrl; }
    public long getMaxFileSize() { return maxFileSize; }
    public void setMaxFileSize(long maxFileSize) { this.maxFileSize = maxFileSize; }
    public int getMaxFiles() { return maxFiles; }
    public void setMaxFiles(int maxFiles) { this.maxFiles = maxFiles; }
    public S3 getS3() { return s3; }

    public static class S3 {
        private String endpoint;
        private String region = "ap-northeast-2";
        private String bucket;
        private String accessKey;
        private String secretKey;
        private String publicBaseUrl;
        private boolean pathStyleAccessEnabled;

        public String getEndpoint() { return endpoint; }
        public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
        public String getRegion() { return region; }
        public void setRegion(String region) { this.region = region; }
        public String getBucket() { return bucket; }
        public void setBucket(String bucket) { this.bucket = bucket; }
        public String getAccessKey() { return accessKey; }
        public void setAccessKey(String accessKey) { this.accessKey = accessKey; }
        public String getSecretKey() { return secretKey; }
        public void setSecretKey(String secretKey) { this.secretKey = secretKey; }
        public String getPublicBaseUrl() { return publicBaseUrl; }
        public void setPublicBaseUrl(String publicBaseUrl) { this.publicBaseUrl = publicBaseUrl; }
        public boolean isPathStyleAccessEnabled() { return pathStyleAccessEnabled; }
        public void setPathStyleAccessEnabled(boolean enabled) {
            this.pathStyleAccessEnabled = enabled;
        }
    }
}
