package com.save.storage;

import java.time.Clock;
import java.time.Instant;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class UploadRequestLimiterTest {
    @Test void expiresWindowsWithoutSleepingAndKeepsUsersSeparate() {
        Clock clock = mock(Clock.class);
        when(clock.instant()).thenReturn(Instant.ofEpochSecond(100));
        var config = new StorageProperties(); config.setUploadRequestsPerWindow(2);
        var limiter = new UploadRequestLimiter(config, clock);
        assertThat(limiter.acquire("a")).isZero();
        assertThat(limiter.acquire("a")).isZero();
        assertThat(limiter.acquire("a")).isEqualTo(60);
        assertThat(limiter.acquire("b")).isZero();
        when(clock.instant()).thenReturn(Instant.ofEpochSecond(159));
        assertThat(limiter.acquire("a")).isEqualTo(1);
        when(clock.instant()).thenReturn(Instant.ofEpochSecond(160));
        assertThat(limiter.acquire("a")).isZero();
    }

    @Test void boundsTrackedUsersAndReclaimsExpiredEntries() {
        Clock clock = mock(Clock.class);
        when(clock.instant()).thenReturn(Instant.ofEpochSecond(100));
        var config = new StorageProperties(); config.setMaxTrackedUploadUsers(1);
        var limiter = new UploadRequestLimiter(config, clock);
        assertThat(limiter.acquire("a")).isZero();
        assertThat(limiter.acquire("b")).isEqualTo(60);
        when(clock.instant()).thenReturn(Instant.ofEpochSecond(160));
        assertThat(limiter.acquire("b")).isZero();
    }

    @Test void parallelRequestsCannotBypassLimit() throws Exception {
        var config = new StorageProperties(); config.setUploadRequestsPerWindow(5);
        var limiter = new UploadRequestLimiter(config, Clock.fixed(Instant.EPOCH, java.time.ZoneOffset.UTC));
        var executor = Executors.newFixedThreadPool(8);
        var allowed = new AtomicInteger();
        try {
            for (int i = 0; i < 50; i++) executor.submit(() -> { if (limiter.acquire("a") == 0) allowed.incrementAndGet(); });
        } finally { executor.shutdown(); }
        assertThat(executor.awaitTermination(5, TimeUnit.SECONDS)).isTrue();
        assertThat(allowed.get()).isEqualTo(5);
    }
}
