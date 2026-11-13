package com.save.storage;

import java.time.Clock;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

/** Per-process fixed-window limit, shared by item and profile uploads. */
@Component
public class UploadRequestLimiter {
    private record Window(long start, int count) {}
    private final Map<String, Window> windows = new HashMap<>();
    private final Clock clock;
    private final int requests;
    private final long seconds;
    private final int capacity;

    public UploadRequestLimiter(StorageProperties properties, Clock clock) {
        this.clock = clock;
        requests = properties.getUploadRequestsPerWindow();
        seconds = properties.getUploadWindowSeconds();
        capacity = properties.getMaxTrackedUploadUsers();
        if (requests <= 0 || seconds <= 0 || capacity <= 0) {
            throw new IllegalArgumentException("Upload rate limits must be positive");
        }
    }

    /** Zero permits the request; otherwise returns Retry-After seconds. */
    public synchronized long acquire(String userId) {
        long now = clock.instant().getEpochSecond();
        Window current = windows.get(userId);
        if (current != null && now - current.start() < seconds) {
            if (current.count() >= requests) return Math.max(1, seconds - (now - current.start()));
            windows.put(userId, new Window(current.start(), current.count() + 1));
            return 0;
        }
        if (windows.size() >= capacity) {
            windows.entrySet().removeIf(entry -> now - entry.getValue().start() >= seconds);
            if (windows.size() >= capacity) return seconds;
        }
        windows.put(userId, new Window(now, 1));
        return 0;
    }
}
