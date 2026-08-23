package com.save.notification;

import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PushDeliveryTicketRepository extends JpaRepository<PushDeliveryTicket, Integer> {
    @EntityGraph(attributePaths = "deviceToken")
    List<PushDeliveryTicket> findTop500ByStatusAndCreatedAtBeforeOrderByCreatedAtAsc(
            PushDeliveryStatus status, Instant createdBefore);
}
