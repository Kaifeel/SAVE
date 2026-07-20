package com.save.chat.domain;

import com.save.item.Item;
import com.save.user.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_rooms", uniqueConstraints = @UniqueConstraint(
        name = "uk_chat_room_item_borrower_lender",
        columnNames = {"item_id", "borrower_id", "lender_id"}))
public class ChatRoom {
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

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected ChatRoom() {}
    public ChatRoom(Item item, User borrower, User lender) {
        this.item = item; this.borrower = borrower; this.lender = lender;
    }
    @PrePersist void prePersist() { createdAt = LocalDateTime.now(); }
    public Integer getId() { return id; }
    public Item getItem() { return item; }
    public User getBorrower() { return borrower; }
    public User getLender() { return lender; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
