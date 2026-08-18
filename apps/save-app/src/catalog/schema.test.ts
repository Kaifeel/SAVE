import { parseCatalogItem, parseCatalogPage, parseRecommendation } from './schema';

export const backendItem = {
  id: 7,
  ownerId: 3,
  ownerName: '김세이브',
  ownerUniversityId: 1,
  ownerUniversityName: '부경대학교',
  type: 'LEND',
  title: '삼각대',
  rentalFee: 3000,
  rentalUnit: 'DAY',
  pickupLocationId: 4,
  pickupLocationName: '도서관',
  description: '가벼운 삼각대',
  precautions: '파손 주의',
  status: 'AVAILABLE',
  mainImageUrl: null,
  imageUrls: [],
  viewCount: 2,
  wishlistCount: 1,
  wishlisted: false,
  ownerRating: 4.5,
  reviewCount: 8,
  createdAt: '2026-08-18T01:00:00Z',
  updatedAt: '2026-08-18T01:00:00Z',
};

describe('catalog schema', () => {
  it('normalizes a complete ItemResponse without inventing optional values', () => {
    expect(parseCatalogItem({
      ...backendItem,
      ownerUniversityId: null,
      ownerUniversityName: null,
      pickupLocationId: null,
      pickupLocationName: null,
      precautions: null,
    })).toEqual(expect.objectContaining({
      id: 7,
      title: '삼각대',
      ownerUniversityName: null,
      pickupLocationName: null,
      precautions: null,
      imageUrls: [],
    }));
  });

  it('uses all real image URLs and ignores a redundant main image field', () => {
    const item = parseCatalogItem({
      ...backendItem,
      mainImageUrl: 'one.jpg',
      imageUrls: ['one.jpg', 'two.jpg'],
    });

    expect(item.imageUrls).toEqual(['one.jpg', 'two.jpg']);
  });

  it.each([
    ['id', { ...backendItem, id: 'seven' }],
    ['type', { ...backendItem, type: 'OTHER' }],
    ['imageUrls', { ...backendItem, imageUrls: ['one.jpg', 2] }],
    ['createdAt', { ...backendItem, createdAt: null }],
  ])('rejects a malformed %s in a successful item payload', (_field, payload) => {
    expect(() => parseCatalogItem(payload)).toThrow('catalog');
  });

  it('parses page metadata and every content item', () => {
    expect(parseCatalogPage({
      content: [backendItem],
      pageable: { pageNumber: 2, pageSize: 20 },
      totalElements: 41,
    })).toEqual({
      content: [expect.objectContaining({ id: 7 })],
      pageNumber: 2,
      pageSize: 20,
      totalElements: 41,
    });
  });

  it('parses recommendation fields and validated item payloads', () => {
    expect(parseRecommendation({
      recommendationId: 12,
      headline: '오늘 필요한 물품',
      recommendationReasons: ['학과 맞춤'],
      recommendedKeywords: ['삼각대'],
      recommendedItems: [backendItem],
      department: '컴퓨터공학과',
      interestItems: ['촬영'],
      timePeriod: '오후',
      isExamPeriod: false,
      weatherStatus: '알 수 없음',
      createdAt: '2026-08-18T10:00:00',
    })).toEqual(expect.objectContaining({
      id: 12,
      headline: '오늘 필요한 물품',
      items: [expect.objectContaining({ id: 7 })],
    }));
  });
});
