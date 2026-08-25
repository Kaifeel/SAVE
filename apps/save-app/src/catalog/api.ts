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
  CreateItemInput,
  RecommendationInput,
  RecommendationSummary,
} from './types';

function jsonItemBody(input: CreateItemInput): string {
  return JSON.stringify({
    type: input.type,
    title: input.title,
    rental_fee: input.rentalFee,
    rental_unit: input.rentalUnit,
    pickup_location_id: input.pickupLocationId,
    description: input.description,
    precautions: input.precautions,
  });
}

function multipartItemBody(input: CreateItemInput): FormData {
  const body = new FormData();
  body.append('type', input.type);
  body.append('title', input.title);
  body.append('rentalFee', String(input.rentalFee));
  body.append('rentalUnit', input.rentalUnit);
  body.append('pickupLocationId', String(input.pickupLocationId));
  body.append('description', input.description);
  body.append('precautions', input.precautions);
  input.photos.forEach(photo => {
    if (photo.file) {
      body.append('photos', photo.file, photo.fileName);
      return;
    }
    body.append('photos', {
      uri: photo.uri,
      name: photo.fileName,
      type: photo.mimeType,
    } as unknown as Blob);
  });
  return body;
}

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

export async function createItem(input: CreateItemInput): Promise<CatalogItem> {
  const body = input.photos.length > 0
    ? multipartItemBody(input)
    : jsonItemBody(input);
  const response = await apiRequest<unknown>('/items', { method: 'POST', body });
  return parseCatalogItem(response);
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
