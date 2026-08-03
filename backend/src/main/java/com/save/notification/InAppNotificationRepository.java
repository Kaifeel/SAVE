package com.save.notification;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InAppNotificationRepository extends JpaRepository<InAppNotification, Integer> {
    List<InAppNotification> findTop50ByRecipientIdOrderByCreatedAtDesc(Integer userId);
    Optional<InAppNotification> findByIdAndRecipientId(Integer id, Integer userId);
    long countByRecipientIdAndReadFalse(Integer userId);

    @Modifying
    @Query("""
            update InAppNotification n
               set n.read = true, n.readAt = CURRENT_TIMESTAMP
             where n.recipient.id = :userId and n.read = false
            """)
    int markAllRead(@Param("userId") Integer userId);
}
