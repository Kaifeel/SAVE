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
    ownerId: integer(item.ownerId, 'ownerId'),
    ownerName: string(item.ownerName, 'ownerName'),
    ownerUniversityId: nullableInteger(item.ownerUniversityId, 'ownerUniversityId'),
    ownerUniversityName: nullableString(item.ownerUniversityName, 'ownerUniversityName'),
    type: itemType(item.type),
    title: string(item.title, 'title'),
    rentalFee: integer(item.rentalFee, 'rentalFee'),
    rentalUnit: string(item.rentalUnit, 'rentalUnit'),
    pickupLocationId: nullableInteger(item.pickupLocationId, 'pickupLocationId'),
    pickupLocationName: nullableString(item.pickupLocationName, 'pickupLocationName'),
    description: string(item.description, 'description'),
    precautions: nullableString(item.precautions, 'precautions'),
    status: itemStatus(item.status),
    imageUrls: stringArray(item.imageUrls, 'imageUrls'),
    viewCount: integer(item.viewCount, 'viewCount'),
    wishlistCount: integer(item.wishlistCount, 'wishlistCount'),
    wishlisted: boolean(item.wishlisted, 'wishlisted'),
    ownerRating: number(item.ownerRating, 'ownerRating'),
    reviewCount: integer(item.reviewCount, 'reviewCount'),
    createdAt: string(item.createdAt, 'createdAt'),
    updatedAt: string(item.updatedAt, 'updatedAt'),
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
    pageNumber: integer(pageable.pageNumber, 'pageNumber'),
    pageSize: integer(pageable.pageSize, 'pageSize'),
    totalElements: integer(page.totalElements, 'totalElements'),
  };
}

export function parseRecommendation(value: unknown): RecommendationSummary {
  const recommendation = record(value, 'recommendation');
  if (!Array.isArray(recommendation.recommendedItems)) {
    protocolError('recommendedItems');
  }
  return {
    id: integer(recommendation.recommendationId, 'recommendationId'),
    headline: string(recommendation.headline, 'headline'),
    reasons: stringArray(recommendation.recommendationReasons, 'recommendationReasons'),
    keywords: stringArray(recommendation.recommendedKeywords, 'recommendedKeywords'),
    items: recommendation.recommendedItems.map(parseCatalogItem),
    department: string(recommendation.department, 'department'),
    interestItems: stringArray(recommendation.interestItems, 'interestItems'),
    timePeriod: string(recommendation.timePeriod, 'timePeriod'),
    isExamPeriod: boolean(recommendation.isExamPeriod, 'isExamPeriod'),
    weatherStatus: string(recommendation.weatherStatus, 'weatherStatus'),
    createdAt: string(recommendation.createdAt, 'createdAt'),
  };
}

export function parseRecommendationList(value: unknown): RecommendationSummary[] {
  if (!Array.isArray(value)) {
    protocolError('recommendations');
  }
  return value.map(parseRecommendation);
}
