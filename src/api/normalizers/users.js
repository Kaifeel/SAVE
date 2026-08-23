import { unwrapList, unwrapObject } from './shared.js'

export function normalizePublicUserProfile(response) {
  const profile = unwrapObject(response)

  return {
    id: profile.id ?? profile.userId ?? profile.user_id,
    name: profile.name || '사용자',
    department: profile.department || '',
    universityId: profile.university_id ?? profile.universityId,
    universityName: profile.university_name || profile.universityName || '',
    profileImageUrl: profile.profile_image_url || profile.profileImageUrl || null,
    rating: Number(profile.rating || 0),
    reviewCount: Number(profile.review_count ?? profile.reviewCount ?? 0),
    completedTradeCount: Number(
      profile.completed_trade_count ?? profile.completedTradeCount ?? 0,
    ),
  }
}

export function normalizePublicReview(response) {
  const review = unwrapObject(response) || {}
  return {
    id: review.id ?? review.reviewId ?? review.review_id,
    rating: Number(review.rating || 0),
    content: review.content || '',
    createdAt: review.created_at ?? review.createdAt,
    itemId: review.item_id ?? review.itemId,
    itemTitle: review.item_title ?? review.itemTitle ?? '',
    reviewerId: review.reviewer_id ?? review.reviewerId,
    reviewerName: review.reviewer_name ?? review.reviewerName ?? '사용자',
    reviewerProfileImageUrl:
      review.reviewer_profile_image_url ?? review.reviewerProfileImageUrl ?? null,
    revieweeRole: review.reviewee_role ?? review.revieweeRole,
  }
}

export function normalizePublicReviewsResponse(response) {
  return unwrapList(response).map(normalizePublicReview)
}
