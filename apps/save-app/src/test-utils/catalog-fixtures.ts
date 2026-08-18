import type { CatalogItem, CatalogPage, RecommendationSummary } from '@/catalog/types';

export const catalogItem: CatalogItem = {
  id: 7,
  ownerId: 3,
  ownerName: '김세이브',
  ownerUniversityId: 1,
  ownerUniversityName: '부경대학교',
  type: 'LEND',
  title: '서버 삼각대',
  rentalFee: 3000,
  rentalUnit: 'DAY',
  pickupLocationId: 4,
  pickupLocationName: '도서관',
  description: '가벼운 삼각대',
  precautions: '파손 주의',
  status: 'AVAILABLE',
  imageUrls: [],
  viewCount: 2,
  wishlistCount: 1,
  wishlisted: false,
  ownerRating: 4.5,
  reviewCount: 8,
  createdAt: '2026-08-18T01:00:00Z',
  updatedAt: '2026-08-18T01:00:00Z',
};

export function catalogPage(content: CatalogItem[] = [catalogItem]): CatalogPage {
  return { content, pageNumber: 0, pageSize: 20, totalElements: content.length };
}

export const recommendation: RecommendationSummary = {
  id: 12,
  headline: '오늘 필요한 물품',
  reasons: ['학과 맞춤'],
  keywords: ['삼각대'],
  items: [catalogItem],
  department: '컴퓨터공학과',
  interestItems: ['삼각대'],
  timePeriod: '오후',
  isExamPeriod: false,
  weatherStatus: '알 수 없음',
  createdAt: '2026-08-18T10:00:00',
};
