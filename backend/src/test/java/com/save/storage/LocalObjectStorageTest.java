package com.save.storage;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import static org.assertj.core.api.Assertions.assertThat;

class LocalObjectStorageTest {
    @TempDir
    Path tempDirectory;

    @Test
    void generatedObjectNameDoesNotContainClientPath() {
        StorageProperties properties = new StorageProperties();
        properties.setLocalRoot(tempDirectory.toString());
        LocalObjectStorage storage = new LocalObjectStorage(properties);

        StoredObject stored = storage.store(
                new ValidatedImage(new byte[]{1, 2, 3}, "png", "image/png"));

        assertThat(stored.key()).startsWith("items/");
        assertThat(stored.key()).doesNotContain("..", "secret.png");
        assertThat(stored.url()).startsWith("/uploads/items/");
        assertThat(Files.exists(tempDirectory.resolve(stored.key()))).isTrue();
    }
}
