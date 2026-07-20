package com.save.user;

public record UserResponse(Integer id, String email, String name, String department,
                           String profileImageUrl, UserRole role) {
    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getName(),
                user.getDepartment(), user.getProfileImageUrl(), user.getRole());
    }
}
