import { apiRequest } from '@/api/client';
import type { CatalogItem } from '@/catalog/types';
import {
  parsePublicItems,
  parsePublicProfile,
  parsePublicReviews,
  type PublicReview,
  type PublicUserProfile,
} from './public-schema';

function requireUserId(userId: number): void {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('Invalid public profile user id');
  }
}

export async function getPublicProfile(userId: number): Promise<PublicUserProfile> {
  requireUserId(userId);
  return parsePublicProfile(await apiRequest<unknown>(`/users/${userId}/profile`));
}

export async function getPublicItems(userId: number): Promise<CatalogItem[]> {
  requireUserId(userId);
  return parsePublicItems(await apiRequest<unknown>(`/users/${userId}/items`));
}

export async function getPublicReviews(userId: number): Promise<PublicReview[]> {
  requireUserId(userId);
  return parsePublicReviews(await apiRequest<unknown>(`/users/${userId}/reviews`));
}
