package com.save.user;

import java.time.LocalDateTime;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ExpiredSanctionScheduler {
    private final UserRepository userRepository;

    public ExpiredSanctionScheduler(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Scheduled(fixedDelayString = "${app.sanctions.release-interval-ms:60000}")
    @Transactional
    public int releaseExpiredSanctions() {
        return userRepository.releaseExpiredSanctions(LocalDateTime.now());
    }
}
