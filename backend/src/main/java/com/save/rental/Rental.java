package com.save.rental;

import com.save.item.Item;
import com.save.chat.domain.ChatRoom;
import com.save.user.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDateTime;

@Entity
@Table(name = "rentals")
public class Rental {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "borrower_id", nullable = false)
    private User borrower;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lender_id", nullable = false)
    private User lender;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "chat_room_id", nullable = false)
    private ChatRoom chatRoom;

    @Column(name = "start_date", nullable = false)
    private LocalDateTime startDate;

    @Column(name = "end_date")
    private LocalDateTime endDate;

    @Column(name = "total_price", nullable = false)
    private Integer totalPrice;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RentalStatus status = RentalStatus.REQUESTED;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "returned_at")
    private Instant returnedAt;

    protected Rental() {}
    public Rental(Item item, User borrower, User lender, ChatRoom chatRoom,
                  LocalDateTime startDate, LocalDateTime endDate, Integer totalPrice) {
        this.item = item;
        this.borrower = borrower;
        this.lender = lender;
        this.chatRoom = chatRoom;
        this.startDate = startDate;
        this.endDate = endDate;
        this.totalPrice = totalPrice;
    }

    @PrePersist void prePersist() { createdAt = LocalDateTime.now(); updatedAt = createdAt; }
    @PreUpdate void preUpdate() { updatedAt = LocalDateTime.now(); }
    public Integer getId() { return id; }
    public Item getItem() { return item; }
    public User getBorrower() { return borrower; }
    public User getLender() { return lender; }
    public ChatRoom getChatRoom() { return chatRoom; }
    public LocalDateTime getStartDate() { return startDate; }
    public LocalDateTime getEndDate() { return endDate; }
    public Integer getTotalPrice() { return totalPrice; }
    public RentalStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public Instant getReturnedAt() { return returnedAt; }
    public void changeStatus(RentalStatus status) { this.status = status; }
    public void returnItem(Instant returnedAt) {
        if (this.returnedAt != null) {
            throw new IllegalStateException("반납 시각은 다시 설정할 수 없습니다.");
        }
        this.status = RentalStatus.RETURNED;
        this.returnedAt = returnedAt;
    }
}
