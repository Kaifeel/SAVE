package com.save.user;

import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class ExpiredSanctionSchedulerIntegrationTest {
    @Autowired UserRepository userRepository;
    @Autowired ExpiredSanctionScheduler scheduler;
    @Autowired EntityManager entityManager;

    @Test
    void releasesOnlyExpiredSanctions() {
        User expired = new User("만료 사용자");
        expired.sanction(LocalDateTime.now().minusMinutes(1), "만료된 제재");
        User activeSanction = new User("제재 사용자");
        activeSanction.sanction(LocalDateTime.now().plusDays(1), "유효한 제재");
        userRepository.saveAndFlush(expired);
        userRepository.saveAndFlush(activeSanction);

        int releasedCount = scheduler.releaseExpiredSanctions();
        entityManager.clear();

        User released = userRepository.findById(expired.getId()).orElseThrow();
        User stillSuspended = userRepository.findById(activeSanction.getId()).orElseThrow();
        assertThat(releasedCount).isEqualTo(1);
        assertThat(released.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(released.getSanctionedUntil()).isNull();
        assertThat(released.getSanctionReason()).isNull();
        assertThat(stillSuspended.getStatus()).isEqualTo(UserStatus.SUSPENDED);
        assertThat(stillSuspended.getSanctionedUntil()).isNotNull();
        assertThat(stillSuspended.getSanctionReason()).isEqualTo("유효한 제재");
    }
}
