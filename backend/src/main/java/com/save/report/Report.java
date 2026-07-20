package com.save.report;

import com.save.user.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "reports")
public class Report {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @Column(name = "reported_user_id")
    private Integer reportedUserId;

    @Column(name = "item_id")
    private Integer itemId;

    @Column(name = "chat_room_id")
    private Integer chatRoomId;

    @Column(nullable = false, length = 1000)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReportStatus status = ReportStatus.PENDING;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "handled_at")
    private LocalDateTime handledAt;

    protected Report() {}
    public Report(User reporter, Integer reportedUserId, Integer itemId,
                  Integer chatRoomId, String reason) {
        this.reporter = reporter;
        this.reportedUserId = reportedUserId;
        this.itemId = itemId;
        this.chatRoomId = chatRoomId;
        this.reason = reason;
    }
    @PrePersist void prePersist() { createdAt = LocalDateTime.now(); updatedAt = createdAt; }
    @PreUpdate void preUpdate() { updatedAt = LocalDateTime.now(); }
    public Integer getId() { return id; }
    public User getReporter() { return reporter; }
    public Integer getReportedUserId() { return reportedUserId; }
    public Integer getItemId() { return itemId; }
    public Integer getChatRoomId() { return chatRoomId; }
    public String getReason() { return reason; }
    public ReportStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public LocalDateTime getHandledAt() { return handledAt; }
    public void changeStatus(ReportStatus status) {
        this.status = status;
        this.handledAt = LocalDateTime.now();
    }
}
