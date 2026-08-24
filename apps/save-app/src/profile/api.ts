import { apiRequest } from '@/api/client';
import type { AuthUser } from '@/auth/types';
import type { CatalogItem } from '@/catalog/types';
import { parseCatalogItemList, parseMyProfile } from './schema';

export async function getMyProfile(): Promise<AuthUser> {
  return parseMyProfile(await apiRequest<unknown>('/users/me'));
}

export async function getMyItems(): Promise<CatalogItem[]> {
  const response = await apiRequest<unknown>('/users/me/items');
  return parseCatalogItemList(response, 'my items');
}

export async function getMyWishlist(): Promise<CatalogItem[]> {
  const response = await apiRequest<unknown>('/users/me/wishlist');
  return parseCatalogItemList(response, 'wishlist');
}
