package com.save.storage;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;

final class ObjectKeyFactory {
    private ObjectKeyFactory() {}

    static String itemImage(String extension) {
        return image("items", extension);
    }

    static String profileImage(String extension) {
        return image("profiles", extension);
    }

    private static String image(String directory, String extension) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        return "%s/%d/%02d/%s.%s".formatted(
                directory, today.getYear(), today.getMonthValue(), UUID.randomUUID(), extension);
    }
}
