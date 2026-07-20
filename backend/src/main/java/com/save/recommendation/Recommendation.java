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
    private String department;

    @ElementCollection
    @CollectionTable(name = "recommendation_interests",
            joinColumns = @JoinColumn(name = "recommendation_id"))
    @Column(name = "interest_item", length = 100)
    private List<String> interestItems = new ArrayList<>();

    @Column(name = "time_period", nullable = false, length = 30)
    private String timePeriod;

    @Column(name = "is_exam_period", nullable = false)
    private boolean examPeriod;

    @Column(name = "weather_status", nullable = false, length = 30)
    private String weatherStatus;

    @ElementCollection
    @CollectionTable(name = "recommendation_keywords",
            joinColumns = @JoinColumn(name = "recommendation_id"))
    @Column(name = "keyword", nullable = false, length = 100)
    @OrderColumn(name = "display_order")
    private List<String> recommendedKeywords = new ArrayList<>();

    @ManyToMany
    @JoinTable(name = "recommendation_items",
            joinColumns = @JoinColumn(name = "recommendation_id"),
            inverseJoinColumns = @JoinColumn(name = "item_id"))
    @OrderColumn(name = "display_order")
    private List<Item> items = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected Recommendation() {}
    public Recommendation(User user, RecommendationRequest request, List<String> keywords,
                          List<Item> items) {
        this.user = user;
        this.department = request.department();
        this.interestItems.addAll(request.interestItems());
        this.timePeriod = request.timePeriod();
        this.examPeriod = request.isExamPeriod();
        this.weatherStatus = request.weatherStatus();
        this.recommendedKeywords.addAll(keywords);
        this.items.addAll(items);
    }
    @PrePersist void prePersist() { createdAt = LocalDateTime.now(); }
    public Integer getId() { return id; }
    public User getUser() { return user; }
    public String getDepartment() { return department; }
    public List<String> getInterestItems() { return List.copyOf(interestItems); }
    public String getTimePeriod() { return timePeriod; }
    public boolean isExamPeriod() { return examPeriod; }
    public String getWeatherStatus() { return weatherStatus; }
    public List<String> getRecommendedKeywords() { return List.copyOf(recommendedKeywords); }
    public List<Item> getItems() { return List.copyOf(items); }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
