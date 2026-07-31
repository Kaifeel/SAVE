package com.save.item;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "item_images")
public class ItemImage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected ItemImage() {}

    ItemImage(Item item, String imageUrl, int sortOrder) {
        this.item = item;
        this.imageUrl = imageUrl;
        this.sortOrder = sortOrder;
    }

    @PrePersist
    void prePersist() { createdAt = LocalDateTime.now(); }

    public String getImageUrl() { return imageUrl; }
}
