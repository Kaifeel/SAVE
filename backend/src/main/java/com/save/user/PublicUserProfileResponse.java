package com.save.user;

public record PublicUserProfileResponse(
        Integer id,
        String name,
        String department,
        Integer universityId,
        String universityName,
        String profileImageUrl,
        double rating,
        long reviewCount,
        long completedTradeCount) {

    public static PublicUserProfileResponse from(User user, long completedTradeCount) {
        Integer universityId = user.getUniversity() == null ? null : user.getUniversity().getId();
        String universityName = user.getUniversity() == null ? null : user.getUniversity().getName();
        return new PublicUserProfileResponse(
                user.getId(),
                user.getName(),
                user.getDepartment(),
                universityId,
                universityName,
                user.getProfileImageUrl(),
                0.0,
                0,
                completedTradeCount);
    }
}
