package com.save.user;

public record UserResponse(Integer id, String email, String name, String department,
                           Integer universityId, String universityName,
                           String profileImageUrl, UserRole role) {
    public static UserResponse from(User user) {
        Integer universityId = user.getUniversity() == null ? null : user.getUniversity().getId();
        String universityName = user.getUniversity() == null ? null : user.getUniversity().getName();
        return new UserResponse(user.getId(), user.getEmail(), user.getName(),
                user.getDepartment(), universityId, universityName,
                user.getProfileImageUrl(), user.getRole());
    }
}
