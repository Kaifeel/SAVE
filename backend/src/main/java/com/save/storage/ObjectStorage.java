package com.save.storage;

public interface ObjectStorage {
    StoredObject store(ValidatedImage image);
    StoredObject storeProfile(ValidatedImage image);
}
