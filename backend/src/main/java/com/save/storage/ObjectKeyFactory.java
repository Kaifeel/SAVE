package com.save.storage;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;

final class ObjectKeyFactory {
    private ObjectKeyFactory() {}

    static String itemImage(String extension) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        return "items/%d/%02d/%s.%s".formatted(
                today.getYear(), today.getMonthValue(), UUID.randomUUID(), extension);
    }
}
