package com.save.notification;

import com.save.rental.Rental;
import com.save.user.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications", indexes = {
        @Index(name = "idx_notifications_user_created", columnList = "user_id, created_at"),
        @Index(name = "idx_notifications_user_read", columnList = "user_id, is_read")
})
public class InAppNotification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User recipient;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rental_id", nullable = false)
    private Rental rental;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private InAppNotificationType type;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, length = 500)
    private String content;

    @Column(name = "is_read", nullable = false)
    private boolean read;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    protected InAppNotification() {}

    public InAppNotification(User recipient, Rental rental, InAppNotificationType type,
                             String title, String content) {
        this.recipient = recipient;
        this.rental = rental;
        this.type = type;
        this.title = title;
        this.content = content;
    }

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
    }

    public void markRead() {
        if (!read) {
            read = true;
            readAt = LocalDateTime.now();
        }
    }

    public Integer getId() { return id; }
    public User getRecipient() { return recipient; }
    public Rental getRental() { return rental; }
    public InAppNotificationType getType() { return type; }
    public String getTitle() { return title; }
    public String getContent() { return content; }
    public boolean isRead() { return read; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
