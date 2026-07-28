package com.save.storage;

public record ValidatedImage(byte[] bytes, String extension, String contentType) {
    public ValidatedImage {
        bytes = bytes.clone();
    }

    @Override
    public byte[] bytes() {
        return bytes.clone();
    }
}
