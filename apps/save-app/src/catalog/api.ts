import { apiRequest } from '@/api/client';
import {
  parseCatalogItem,
  parseCatalogPage,
  parseRecommendation,
  parseRecommendationList,
} from './schema';
import type {
  CatalogItem,
  CatalogItemType,
  CatalogPage,
  RecommendationInput,
  RecommendationSummary,
} from './types';

export type ListItemsInput = {
  type?: CatalogItemType;
  query?: string;
  onlyAvailable?: boolean;
  sort?: 'latest' | 'popular';
  page?: number;
  size?: number;
  universityId?: number | null;
};

export async function listItems(input: ListItemsInput = {}): Promise<CatalogPage> {
  const response = await apiRequest<unknown>('/items', {
    params: {
      type: input.type,
      query: input.query,
      only_available: input.onlyAvailable,
      sort: input.sort,
      page: input.page,
      size: input.size,
      university_id: input.universityId,
    },
  });
  return parseCatalogPage(response);
}

export async function getItem(id: number): Promise<CatalogItem> {
  return parseCatalogItem(await apiRequest<unknown>(`/items/${id}`));
}

export async function setWishlist(id: number, wishlisted: boolean): Promise<void> {
  await apiRequest<void>(`/items/${id}/wishlist`, {
    method: wishlisted ? 'POST' : 'DELETE',
  });
}

export async function getRecommendationHistory(): Promise<RecommendationSummary[]> {
  return parseRecommendationList(await apiRequest<unknown>('/recommendations/me'));
}

export async function createRecommendation(
  input: RecommendationInput,
): Promise<RecommendationSummary> {
  const response = await apiRequest<unknown>('/recommendations', {
    method: 'POST',
    body: JSON.stringify({
      department: input.department,
      interest_items: input.interestItems,
      time_period: input.timePeriod,
      is_exam_period: input.isExamPeriod,
      weather_status: input.weatherStatus,
    }),
  });
  return parseRecommendation(response);
}
