import { parseCatalogItem, parseCatalogPage, parseRecommendation } from './schema';

export const backendItem = {
  id: 7,
  owner_id: 3,
  owner_name: '김세이브',
  owner_university_id: 1,
  owner_university_name: '부경대학교',
  type: 'LEND',
  title: '삼각대',
  rental_fee: 3000,
  rental_unit: 'DAY',
  pickup_location_id: 4,
  pickup_location_name: '도서관',
  description: '가벼운 삼각대',
  precautions: '파손 주의',
  status: 'AVAILABLE',
  main_image_url: null,
  image_urls: [],
  view_count: 2,
  wishlist_count: 1,
  wishlisted: false,
  owner_rating: 4.5,
  review_count: 8,
  created_at: '2026-08-18T01:00:00Z',
  updated_at: '2026-08-18T01:00:00Z',
};

describe('catalog schema', () => {
  it('normalizes a complete ItemResponse without inventing optional values', () => {
    expect(parseCatalogItem({
      ...backendItem,
      owner_university_id: null,
      owner_university_name: null,
      pickup_location_id: null,
      pickup_location_name: null,
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
      main_image_url: 'one.jpg',
      image_urls: ['one.jpg', 'two.jpg'],
    });

    expect(item.imageUrls).toEqual(['one.jpg', 'two.jpg']);
  });

  it.each([
    ['id', { ...backendItem, id: 'seven' }],
    ['type', { ...backendItem, type: 'OTHER' }],
    ['image_urls', { ...backendItem, image_urls: ['one.jpg', 2] }],
    ['created_at', { ...backendItem, created_at: null }],
  ])('rejects a malformed %s in a successful item payload', (_field, payload) => {
    expect(() => parseCatalogItem(payload)).toThrow('catalog');
  });

  it('parses page metadata and every content item', () => {
    expect(parseCatalogPage({
      content: [backendItem],
      pageable: { page_number: 2, page_size: 20 },
      total_elements: 41,
    })).toEqual({
      content: [expect.objectContaining({ id: 7 })],
      pageNumber: 2,
      pageSize: 20,
      totalElements: 41,
    });
  });

  it('parses recommendation fields and validated item payloads', () => {
    expect(parseRecommendation({
      recommendation_id: 12,
      headline: '오늘 필요한 물품',
      recommendation_reasons: ['학과 맞춤'],
      recommended_keywords: ['삼각대'],
      recommended_items: [backendItem],
      department: '컴퓨터공학과',
      interest_items: ['촬영'],
      time_period: '오후',
      is_exam_period: false,
      weather_status: '알 수 없음',
      created_at: '2026-08-18T10:00:00',
    })).toEqual(expect.objectContaining({
      id: 12,
      headline: '오늘 필요한 물품',
      items: [expect.objectContaining({ id: 7 })],
    }));
  });
});
