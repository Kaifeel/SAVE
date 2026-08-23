package com.save.notification;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "push_delivery_tickets", indexes =
        @Index(name = "idx_push_ticket_status_created", columnList = "status, created_at"))
public class PushDeliveryTicket {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "ticket_id", nullable = false, unique = true, length = 100)
    private String ticketId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "device_token_id", nullable = false)
    private UserDeviceToken deviceToken;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PushDeliveryStatus status = PushDeliveryStatus.PENDING;

    @Column(name = "error_code", length = 100)
    private String errorCode;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "checked_at")
    private Instant checkedAt;

    protected PushDeliveryTicket() {}

    public PushDeliveryTicket(String ticketId, UserDeviceToken deviceToken) {
        this.ticketId = ticketId;
        this.deviceToken = deviceToken;
    }

    @PrePersist
    void created() {
        if (createdAt == null) createdAt = Instant.now();
    }

    public void delivered(Instant checkedAt) {
        this.status = PushDeliveryStatus.DELIVERED;
        this.errorCode = null;
        this.checkedAt = checkedAt;
    }

    public void failed(String errorCode, Instant checkedAt) {
        this.status = PushDeliveryStatus.FAILED;
        this.errorCode = errorCode;
        this.checkedAt = checkedAt;
    }

    public Integer getId() { return id; }
    public String getTicketId() { return ticketId; }
    public UserDeviceToken getDeviceToken() { return deviceToken; }
    public PushDeliveryStatus getStatus() { return status; }
    public String getErrorCode() { return errorCode; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getCheckedAt() { return checkedAt; }
}
