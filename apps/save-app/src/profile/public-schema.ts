import { parseCatalogItem } from '@/catalog/schema';
import type { CatalogItem } from '@/catalog/types';

export type PublicUserProfile = {
  id: number;
  name: string;
  department: string | null;
  universityId: number | null;
  universityName: string | null;
  profileImageUrl: string | null;
  rating: number;
  reviewCount: number;
  completedTradeCount: number;
};

export type PublicReview = {
  id: number;
  rating: number;
  content: string;
  createdAt: string;
  itemId: number;
  itemTitle: string;
  reviewerId: number;
  reviewerName: string;
  reviewerProfileImageUrl: string | null;
  revieweeRole: 'LENDER' | 'BORROWER';
};

function invalid(field: string): never {
  throw new Error(`Invalid public profile response: ${field}`);
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalid(field);
  return value as Record<string, unknown>;
}

function string(value: unknown, field: string, nonBlank = false): string {
  if (typeof value !== 'string' || (nonBlank && !value.trim())) invalid(field);
  return value;
}

function nullableString(value: unknown, field: string): string | null {
  return value === null ? null : string(value, field);
}

function positiveInteger(value: unknown, field: string): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : invalid(field);
}

function nullablePositiveInteger(value: unknown, field: string): number | null {
  return value === null ? null : positiveInteger(value, field);
}

function nonNegativeInteger(value: unknown, field: string): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : invalid(field);
}

function rating(value: unknown, field: string, allowZero: boolean): number {
  const minimum = allowZero ? 0 : 1;
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= 5
    ? value
    : invalid(field);
}

export function parsePublicProfile(value: unknown): PublicUserProfile {
  const profile = record(value, 'profile');
  return {
    id: positiveInteger(profile.id, 'id'),
    name: string(profile.name, 'name', true),
    department: nullableString(profile.department, 'department'),
    universityId: nullablePositiveInteger(profile.university_id, 'university_id'),
    universityName: nullableString(profile.university_name, 'university_name'),
    profileImageUrl: nullableString(profile.profile_image_url, 'profile_image_url'),
    rating: rating(profile.rating, 'rating', true),
    reviewCount: nonNegativeInteger(profile.review_count, 'review_count'),
    completedTradeCount: nonNegativeInteger(profile.completed_trade_count, 'completed_trade_count'),
  };
}

export function parsePublicReview(value: unknown): PublicReview {
  const review = record(value, 'review');
  return {
    id: positiveInteger(review.id, 'id'),
    rating: rating(review.rating, 'rating', false),
    content: string(review.content, 'content', true),
    createdAt: string(review.created_at, 'created_at', true),
    itemId: positiveInteger(review.item_id, 'item_id'),
    itemTitle: string(review.item_title, 'item_title', true),
    reviewerId: positiveInteger(review.reviewer_id, 'reviewer_id'),
    reviewerName: string(review.reviewer_name, 'reviewer_name', true),
    reviewerProfileImageUrl: nullableString(
      review.reviewer_profile_image_url,
      'reviewer_profile_image_url',
    ),
    revieweeRole: review.reviewee_role === 'LENDER' || review.reviewee_role === 'BORROWER'
      ? review.reviewee_role
      : invalid('reviewee_role'),
  };
}

export function parsePublicItems(value: unknown): CatalogItem[] {
  if (!Array.isArray(value)) invalid('items');
  return value.map(parseCatalogItem);
}

export function parsePublicReviews(value: unknown): PublicReview[] {
  if (!Array.isArray(value)) invalid('reviews');
  return value.map(parsePublicReview);
}
