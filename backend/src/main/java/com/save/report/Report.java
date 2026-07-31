package com.save.report;

import com.save.chat.domain.ChatRoom;
import com.save.item.Item;
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_user_id")
    private User reportedUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id")
    private Item item;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_room_id")
    private ChatRoom chatRoom;

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
    public Report(User reporter, User reportedUser, Item item,
                  ChatRoom chatRoom, String reason) {
        this.reporter = reporter;
        this.reportedUser = reportedUser;
        this.item = item;
        this.chatRoom = chatRoom;
        this.reason = reason;
    }
    @PrePersist void prePersist() { createdAt = LocalDateTime.now(); updatedAt = createdAt; }
    @PreUpdate void preUpdate() { updatedAt = LocalDateTime.now(); }
    public Integer getId() { return id; }
    public User getReporter() { return reporter; }
    public Integer getReportedUserId() {
        return reportedUser == null ? null : reportedUser.getId();
    }
    public Integer getItemId() { return item == null ? null : item.getId(); }
    public Integer getChatRoomId() { return chatRoom == null ? null : chatRoom.getId(); }
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
