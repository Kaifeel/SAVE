package com.save.notification;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.concurrent.ThreadPoolExecutor;
import org.junit.jupiter.api.Test;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

class PushAsyncConfigTest {
    @Test
    void configuresABoundedPushExecutorWithCallerRunsBackpressure() {
        ThreadPoolTaskExecutor executor = new PushAsyncConfig().pushExecutor();
        executor.initialize();
        try {
            assertThat(executor.getCorePoolSize()).isEqualTo(2);
            assertThat(executor.getMaxPoolSize()).isEqualTo(4);
            assertThat(executor.getQueueCapacity()).isEqualTo(200);
            assertThat(executor.getThreadNamePrefix()).isEqualTo("push-");
            assertThat(executor.getThreadPoolExecutor().getRejectedExecutionHandler())
                    .isInstanceOf(ThreadPoolExecutor.CallerRunsPolicy.class);
        } finally {
            executor.shutdown();
        }
    }
}
