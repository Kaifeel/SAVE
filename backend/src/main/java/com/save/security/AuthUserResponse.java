package com.save.security;

import com.save.user.User;
import com.save.user.UserRole;

public record AuthUserResponse(Integer id, String email, String name, String department,
                               String profileImageUrl, UserRole role) {
    static AuthUserResponse from(User user) {
        return new AuthUserResponse(user.getId(), user.getEmail(), user.getName(),
                user.getDepartment(), user.getProfileImageUrl(), user.getRole());
    }
}
