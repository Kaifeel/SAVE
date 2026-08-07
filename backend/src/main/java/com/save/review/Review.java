package com.save.review;

import com.save.rental.Rental;
import com.save.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

@Entity
@Table(name = "reviews", uniqueConstraints =
        @UniqueConstraint(name = "uk_review_rental_reviewer",
                columnNames = {"rental_id", "reviewer_id"}))
public class Review {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rental_id", nullable = false)
    private Rental rental;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reviewer_id", nullable = false)
    private User reviewer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reviewee_id", nullable = false)
    private User reviewee;

    @Column(nullable = false)
    private Integer rating;

    @Column(nullable = false, length = 500)
    private String content;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Review() {}

    public Review(Rental rental, User reviewer, User reviewee,
                  Integer rating, String content, Instant createdAt) {
        this.rental = rental;
        this.reviewer = reviewer;
        this.reviewee = reviewee;
        this.rating = rating;
        this.content = content;
        this.createdAt = createdAt;
    }

    public Integer getId() { return id; }
    public Rental getRental() { return rental; }
    public User getReviewer() { return reviewer; }
    public User getReviewee() { return reviewee; }
    public Integer getRating() { return rating; }
    public String getContent() { return content; }
    public Instant getCreatedAt() { return createdAt; }
}
