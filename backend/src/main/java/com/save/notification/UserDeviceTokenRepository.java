package com.save.notification;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserDeviceTokenRepository extends JpaRepository<UserDeviceToken, Integer> {
    Optional<UserDeviceToken> findByToken(String token);
    List<UserDeviceToken> findByUserIdAndEnabledTrue(Integer userId);
}
