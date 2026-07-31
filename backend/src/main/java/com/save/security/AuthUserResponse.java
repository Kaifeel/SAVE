package com.save.security;

import com.save.user.User;
import com.save.user.UserRole;

public record AuthUserResponse(Integer id, String email, String name, String department,
                               Integer universityId, String universityName,
                               String profileImageUrl, UserRole role) {
    static AuthUserResponse from(User user) {
        Integer universityId = user.getUniversity() == null ? null : user.getUniversity().getId();
        String universityName = user.getUniversity() == null ? null : user.getUniversity().getName();
        return new AuthUserResponse(user.getId(), user.getEmail(), user.getName(),
                user.getDepartment(), universityId, universityName,
                user.getProfileImageUrl(), user.getRole());
    }
}
