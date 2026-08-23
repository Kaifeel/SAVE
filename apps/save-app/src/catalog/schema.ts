import type {
  CatalogItem,
  CatalogItemStatus,
  CatalogItemType,
  CatalogPage,
  RecommendationSummary,
} from './types';

function protocolError(field: string): never {
  throw new Error(`Invalid catalog response: ${field}`);
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    protocolError(field);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, field: string): string {
  return typeof value === 'string' ? value : protocolError(field);
}

function nullableString(value: unknown, field: string): string | null {
  return value === null ? null : string(value, field);
}

function number(value: unknown, field: string): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : protocolError(field);
}

function integer(value: unknown, field: string): number {
  const parsed = number(value, field);
  return Number.isInteger(parsed) ? parsed : protocolError(field);
}

function nullableInteger(value: unknown, field: string): number | null {
  return value === null ? null : integer(value, field);
}

function boolean(value: unknown, field: string): boolean {
  return typeof value === 'boolean' ? value : protocolError(field);
}

function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    protocolError(field);
  }
  return value.map((entry, index) => string(entry, `${field}[${index}]`));
}

function itemType(value: unknown): CatalogItemType {
  return value === 'LEND' || value === 'BORROW'
    ? value
    : protocolError('type');
}

function itemStatus(value: unknown): CatalogItemStatus {
  return value === 'AVAILABLE'
    || value === 'REQUEST_PENDING'
    || value === 'RESERVED'
    || value === 'RENTED'
    || value === 'DELETED'
    ? value
    : protocolError('status');
}

export function parseCatalogItem(value: unknown): CatalogItem {
  const item = record(value, 'item');
  return {
    id: integer(item.id, 'id'),
    ownerId: integer(item.owner_id, 'owner_id'),
    ownerName: string(item.owner_name, 'owner_name'),
    ownerUniversityId: nullableInteger(item.owner_university_id, 'owner_university_id'),
    ownerUniversityName: nullableString(item.owner_university_name, 'owner_university_name'),
    type: itemType(item.type),
    title: string(item.title, 'title'),
    rentalFee: integer(item.rental_fee, 'rental_fee'),
    rentalUnit: string(item.rental_unit, 'rental_unit'),
    pickupLocationId: nullableInteger(item.pickup_location_id, 'pickup_location_id'),
    pickupLocationName: nullableString(item.pickup_location_name, 'pickup_location_name'),
    description: string(item.description, 'description'),
    precautions: nullableString(item.precautions, 'precautions'),
    status: itemStatus(item.status),
    imageUrls: stringArray(item.image_urls, 'image_urls'),
    viewCount: integer(item.view_count, 'view_count'),
    wishlistCount: integer(item.wishlist_count, 'wishlist_count'),
    wishlisted: boolean(item.wishlisted, 'wishlisted'),
    ownerRating: number(item.owner_rating, 'owner_rating'),
    reviewCount: integer(item.review_count, 'review_count'),
    createdAt: string(item.created_at, 'created_at'),
    updatedAt: string(item.updated_at, 'updated_at'),
  };
}

export function parseCatalogPage(value: unknown): CatalogPage {
  const page = record(value, 'page');
  const pageable = record(page.pageable, 'pageable');
  if (!Array.isArray(page.content)) {
    protocolError('content');
  }
  return {
    content: page.content.map(parseCatalogItem),
    pageNumber: integer(pageable.page_number, 'page_number'),
    pageSize: integer(pageable.page_size, 'page_size'),
    totalElements: integer(page.total_elements, 'total_elements'),
  };
}

export function parseRecommendation(value: unknown): RecommendationSummary {
  const recommendation = record(value, 'recommendation');
  if (!Array.isArray(recommendation.recommended_items)) {
    protocolError('recommended_items');
  }
  return {
    id: integer(recommendation.recommendation_id, 'recommendation_id'),
    headline: string(recommendation.headline, 'headline'),
    reasons: stringArray(recommendation.recommendation_reasons, 'recommendation_reasons'),
    keywords: stringArray(recommendation.recommended_keywords, 'recommended_keywords'),
    items: recommendation.recommended_items.map(parseCatalogItem),
    department: string(recommendation.department, 'department'),
    interestItems: stringArray(recommendation.interest_items, 'interest_items'),
    timePeriod: string(recommendation.time_period, 'time_period'),
    isExamPeriod: boolean(recommendation.is_exam_period, 'is_exam_period'),
    weatherStatus: string(recommendation.weather_status, 'weather_status'),
    createdAt: string(recommendation.created_at, 'created_at'),
  };
}

export function parseRecommendationList(value: unknown): RecommendationSummary[] {
  if (!Array.isArray(value)) {
    protocolError('recommendations');
  }
  return value.map(parseRecommendation);
}
