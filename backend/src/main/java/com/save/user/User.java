package com.save.user;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users", uniqueConstraints = {
        @UniqueConstraint(name = "uk_users_email", columnNames = "email"),
        @UniqueConstraint(name = "uk_users_oauth", columnNames = {"oauth_provider", "oauth_id"})
})
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 100)
    private String email;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(length = 100)
    private String department;

    @Column(name = "profile_image_url", length = 255)
    private String profileImageUrl;

    @Column(name = "password_hash", length = 60)
    private String passwordHash;

    @Column(name = "oauth_provider", nullable = false, length = 20)
    private String oauthProvider;

    @Column(name = "oauth_id", nullable = false, length = 100)
    private String oauthId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private UserRole role = UserRole.USER;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "sanctioned_until")
    private LocalDateTime sanctionedUntil;

    @Column(name = "sanction_reason", length = 500)
    private String sanctionReason;

    protected User() {}
    public User(String email, String name, String department, String profileImageUrl,
                String oauthProvider, String oauthId) {
        this.email = email;
        this.name = name;
        this.department = department;
        this.profileImageUrl = profileImageUrl;
        this.oauthProvider = oauthProvider;
        this.oauthId = oauthId;
    }

    public static User local(String email, String passwordHash, String name, String department) {
        User user = new User(email, name, department, null, "LOCAL", email);
        user.passwordHash = passwordHash;
        return user;
    }

    /** 개발 데이터와 단위 테스트를 위한 편의 생성자 */
    public User(String name) {
        String key = UUID.randomUUID().toString();
        this.email = "dev-" + key + "@local.test";
        this.name = name;
        this.oauthProvider = "DEV";
        this.oauthId = key;
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
    public String getEmail() { return email; }
    public String getName() { return name; }
    public String getDepartment() { return department; }
    public String getProfileImageUrl() { return profileImageUrl; }
    public String getPasswordHash() { return passwordHash; }
    public String getOauthProvider() { return oauthProvider; }
    public String getOauthId() { return oauthId; }
    public UserRole getRole() { return role; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public LocalDateTime getSanctionedUntil() { return sanctionedUntil; }
    public String getSanctionReason() { return sanctionReason; }

    public void updateProfile(String name, String department, String profileImageUrl) {
        if (name != null && !name.isBlank()) this.name = name.trim();
        this.department = department == null || department.isBlank() ? null : department.trim();
        if (profileImageUrl != null) {
            this.profileImageUrl = profileImageUrl.isBlank() ? null : profileImageUrl.trim();
        }
    }

    public void sanction(LocalDateTime until, String reason) {
        this.sanctionedUntil = until;
        this.sanctionReason = reason;
    }
}
