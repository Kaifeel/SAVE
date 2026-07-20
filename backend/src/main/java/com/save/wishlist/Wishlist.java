package com.save.wishlist;

import com.save.item.Item;
import com.save.user.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "wishlists", uniqueConstraints = @UniqueConstraint(
        name = "uk_wishlist_user_item", columnNames = {"user_id", "item_id"}))
public class Wishlist {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected Wishlist() {}
    public Wishlist(User user, Item item) { this.user = user; this.item = item; }
    @PrePersist void prePersist() { createdAt = LocalDateTime.now(); }
    public Integer getId() { return id; }
    public User getUser() { return user; }
    public Item getItem() { return item; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
