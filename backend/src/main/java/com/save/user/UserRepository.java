package com.save.user;

import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Integer> {
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    Optional<User> findByOauthProviderAndOauthId(String oauthProvider, String oauthId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        update User u
           set u.status = com.save.user.UserStatus.ACTIVE,
               u.sanctionedUntil = null,
               u.sanctionReason = null,
               u.updatedAt = :now
         where u.status = com.save.user.UserStatus.SUSPENDED
           and u.sanctionedUntil is not null
           and u.sanctionedUntil <= :now
        """)
    int releaseExpiredSanctions(@Param("now") LocalDateTime now);
}
