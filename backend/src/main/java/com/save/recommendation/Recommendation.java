package com.save.recommendation;

import com.save.item.Item;
import com.save.user.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "recommendations")
public class Recommendation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(length = 100)
    private String university;

    @Column(length = 100)
    private String weather;

    @Column(length = 500)
    private String situation;

    @ManyToMany
    @JoinTable(name = "recommendation_items",
            joinColumns = @JoinColumn(name = "recommendation_id"),
            inverseJoinColumns = @JoinColumn(name = "item_id"))
    @OrderColumn(name = "display_order")
    private List<Item> items = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected Recommendation() {}
    public Recommendation(User user, String university, String weather,
                          String situation, List<Item> items) {
        this.user = user;
        this.university = university;
        this.weather = weather;
        this.situation = situation;
        this.items.addAll(items);
    }
    @PrePersist void prePersist() { createdAt = LocalDateTime.now(); }
    public Integer getId() { return id; }
    public User getUser() { return user; }
    public String getUniversity() { return university; }
    public String getWeather() { return weather; }
    public String getSituation() { return situation; }
    public List<Item> getItems() { return List.copyOf(items); }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
