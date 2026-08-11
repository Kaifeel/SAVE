package com.save.item;

import static org.assertj.core.api.Assertions.assertThat;

import com.save.user.User;
import java.time.Instant;
import java.util.TimeZone;
import org.junit.jupiter.api.Test;

class ItemTimestampTest {
    @Test
    void createsUtcInstantsWhenTheJvmDefaultTimezoneIsSeoul() {
        TimeZone original = TimeZone.getDefault();
        try {
            TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"));
            Item item = new Item("시간 테스트 물품", new User("시간 테스트 사용자"));
            Instant before = Instant.now();

            item.prePersist();

            assertThat(item.getCreatedAt()).isBetween(before, Instant.now());
            assertThat(item.getUpdatedAt()).isEqualTo(item.getCreatedAt());
        } finally {
            TimeZone.setDefault(original);
        }
    }
}
