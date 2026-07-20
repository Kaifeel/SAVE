package com.save.notification;

import com.save.user.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_device_tokens", uniqueConstraints =
        @UniqueConstraint(name = "uk_device_token", columnNames = "token"), indexes =
        @Index(name = "idx_device_token_user_enabled", columnList = "user_id, enabled"))
public class UserDeviceToken {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 512)
    private String token;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private DevicePlatform platform;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    protected UserDeviceToken() {}
    public UserDeviceToken(User user, String token, DevicePlatform platform) {
        this.user = user; this.token = token; this.platform = platform;
    }
    @PrePersist @PreUpdate void touch() { updatedAt = LocalDateTime.now(); }
    public void reactivate(User user, DevicePlatform platform) {
        this.user = user; this.platform = platform; this.enabled = true;
    }
    public void disable() { enabled = false; }
    public Integer getId() { return id; }
    public User getUser() { return user; }
    public String getToken() { return token; }
    public DevicePlatform getPlatform() { return platform; }
    public boolean isEnabled() { return enabled; }
}
