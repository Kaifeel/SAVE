package com.save.item;

import com.save.user.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "items")
public class Item {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false, length = 10)
    private String type;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(name = "rental_fee", nullable = false)
    private Integer rentalFee;

    @Enumerated(EnumType.STRING)
    @Column(name = "rental_unit", nullable = false, length = 10)
    private RentalUnit rentalUnit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pickup_location_id")
    private PickupLocation pickupLocation;

    @Column(columnDefinition = "text")
    private String description;

    @Column(columnDefinition = "text")
    private String precautions;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ItemStatus status = ItemStatus.AVAILABLE;

    @Column(name = "view_count", nullable = false)
    private Integer viewCount = 0;

    /**
     * 게시물 감사 시각은 서버 기본 시간대와 무관한 UTC 절대 시각으로 저장한다.
     * 사용자 현지 시간 변환은 API를 소비하는 화면의 표시 단계에서 수행한다.
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "item", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<ItemImage> images = new ArrayList<>();

    protected Item() {}

    public Item(User owner, String type, String title, Integer rentalFee, RentalUnit rentalUnit,
                PickupLocation pickupLocation, String description, String precautions) {
        this.owner = owner;
        this.type = type;
        this.title = title;
        this.rentalFee = rentalFee;
        this.rentalUnit = rentalUnit;
        this.pickupLocation = pickupLocation;
        this.description = description;
        this.precautions = precautions;
    }

    public Item(User owner, String type, String title, Integer rentalFee, RentalUnit rentalUnit,
                PickupLocation pickupLocation, String description, String precautions,
                List<String> photoUrls) {
        this(owner, type, title, rentalFee, rentalUnit, pickupLocation, description, precautions);
        replaceImages(photoUrls);
    }

    /** 개발 데이터와 단위 테스트를 위한 편의 생성자 */
    public Item(String title, User owner) {
        this(owner, "LEND", title, 0, RentalUnit.DAY, null, null, null);
    }

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() { updatedAt = Instant.now(); }

    public Integer getId() { return id; }
    public User getOwner() { return owner; }
    public String getType() { return type; }
    public String getTitle() { return title; }
    public Integer getRentalFee() { return rentalFee; }
    public RentalUnit getRentalUnit() { return rentalUnit; }
    public PickupLocation getPickupLocation() { return pickupLocation; }
    public String getDescription() { return description; }
    public String getPrecautions() { return precautions; }
    public ItemStatus getStatus() { return status; }
    public Integer getViewCount() { return viewCount; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public List<String> getPhotoUrls() {
        return images.stream().map(ItemImage::getImageUrl).toList();
    }

    public void update(String type, String title, Integer rentalFee, RentalUnit rentalUnit,
                       PickupLocation pickupLocation, String description, String precautions,
                       List<String> newPhotoUrls) {
        this.type = type;
        this.title = title;
        this.rentalFee = rentalFee;
        this.rentalUnit = rentalUnit;
        this.pickupLocation = pickupLocation;
        this.description = description;
        this.precautions = precautions;
        if (newPhotoUrls != null && !newPhotoUrls.isEmpty()) replaceImages(newPhotoUrls);
    }

    private void replaceImages(List<String> photoUrls) {
        images.clear();
        if (photoUrls == null) return;
        for (int index = 0; index < photoUrls.size(); index++) {
            images.add(new ItemImage(this, photoUrls.get(index), index));
        }
    }

    public void changeStatus(ItemStatus status) { this.status = status; }
    public void markDeleted() { this.status = ItemStatus.DELETED; }
    public void increaseViewCount() { this.viewCount++; }
}
