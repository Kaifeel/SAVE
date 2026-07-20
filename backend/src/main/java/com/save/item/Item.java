package com.save.item;

import com.save.user.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "items")
public class Item {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 10)
    private String type;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false)
    private Integer price;

    @Column(name = "price_unit", nullable = false, length = 10)
    private String priceUnit;

    @Column(name = "pickup_location", length = 150)
    private String pickupLocation;

    @Column(nullable = false, length = 100)
    private String university = "부경대학교";

    @Column(columnDefinition = "text")
    private String description;

    @Column(columnDefinition = "text")
    private String precautions;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ItemStatus status = ItemStatus.AVAILABLE;

    @Column(name = "view_count", nullable = false)
    private Integer viewCount = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @ElementCollection
    @CollectionTable(name = "item_photos", joinColumns = @JoinColumn(name = "item_id"))
    @Column(name = "photo_url", nullable = false, length = 500)
    @OrderColumn(name = "display_order")
    private List<String> photoUrls = new ArrayList<>();

    protected Item() {}
    public Item(User user, String type, String title, Integer price, String priceUnit,
                String pickupLocation, String description, String precautions) {
        this.user = user;
        this.type = type;
        this.title = title;
        this.price = price;
        this.priceUnit = priceUnit;
        this.pickupLocation = pickupLocation;
        this.description = description;
        this.precautions = precautions;
    }

    public Item(User user, String type, String title, Integer price, String priceUnit,
                String pickupLocation, String university, String description,
                String precautions, List<String> photoUrls) {
        this(user, type, title, price, priceUnit, pickupLocation, description, precautions);
        if (university != null && !university.isBlank()) this.university = university.trim();
        if (photoUrls != null) this.photoUrls.addAll(photoUrls);
    }

    /** 개발 데이터와 단위 테스트를 위한 편의 생성자 */
    public Item(String title, User user) {
        this(user, "LEND", title, 0, "DAY", null, null, null);
    }

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() { updatedAt = LocalDateTime.now(); }

    public Integer getId() { return id; }
    public String getTitle() { return title; }
    public User getUser() { return user; }
    public String getType() { return type; }
    public Integer getPrice() { return price; }
    public String getPriceUnit() { return priceUnit; }
    public String getPickupLocation() { return pickupLocation; }
    public String getUniversity() { return university; }
    public String getDescription() { return description; }
    public String getPrecautions() { return precautions; }
    public ItemStatus getStatus() { return status; }
    public Integer getViewCount() { return viewCount; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public List<String> getPhotoUrls() { return List.copyOf(photoUrls); }

    public void update(String type, String title, Integer price, String priceUnit,
                       String pickupLocation, String university, String description,
                       String precautions, List<String> newPhotoUrls) {
        this.type = type;
        this.title = title;
        this.price = price;
        this.priceUnit = priceUnit;
        this.pickupLocation = pickupLocation;
        if (university != null && !university.isBlank()) this.university = university.trim();
        this.description = description;
        this.precautions = precautions;
        if (newPhotoUrls != null && !newPhotoUrls.isEmpty()) {
            this.photoUrls.clear();
            this.photoUrls.addAll(newPhotoUrls);
        }
    }

    public void changeStatus(ItemStatus status) { this.status = status; }
    public void markDeleted() { this.status = ItemStatus.DELETED; }
    public void increaseViewCount() { this.viewCount++; }
}
