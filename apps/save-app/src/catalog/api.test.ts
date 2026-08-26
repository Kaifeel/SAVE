import { apiRequest } from '@/api/client';
import {
  createItem,
  createRecommendation,
  deleteItem,
  getItem,
  getRecommendationHistory,
  listItems,
  setWishlist,
  updateItem,
} from './api';
import { backendItem } from './schema.test';

jest.mock('@/api/client', () => ({
  apiRequest: jest.fn(),
}));

const apiRequestMock = apiRequest as jest.MockedFunction<typeof apiRequest>;
const pagePayload = {
  content: [backendItem],
  pageable: { page_number: 0, page_size: 20 },
  total_elements: 1,
};

const recommendationPayload = {
  recommendation_id: 12,
  headline: '오늘 필요한 물품',
  recommendation_reasons: ['학과 맞춤'],
  recommended_keywords: ['삼각대'],
  recommended_items: [backendItem],
  department: '컴퓨터공학과',
  interest_items: ['삼각대'],
  time_period: '오후',
  is_exam_period: false,
  weather_status: '알 수 없음',
  created_at: '2026-08-18T10:00:00',
};

const validCreateInput = {
  type: 'LEND' as const,
  title: 'USB-C 충전기',
  rentalFee: 0,
  rentalUnit: '일',
  pickupLocationId: 4,
  description: '정상 작동합니다.',
  precautions: '케이블을 함께 반납해 주세요.',
  photos: [],
};

describe('catalog API', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it('lists items with exact server-side filters', async () => {
    apiRequestMock.mockResolvedValue(pagePayload);

    await expect(listItems({
      type: 'LEND',
      query: '삼각대',
      onlyAvailable: true,
      sort: 'latest',
      page: 0,
      size: 20,
      universityId: 2,
    })).resolves.toEqual(expect.objectContaining({ totalElements: 1 }));

    expect(apiRequestMock).toHaveBeenCalledWith('/items', {
      params: {
        type: 'LEND',
        query: '삼각대',
        only_available: true,
        sort: 'latest',
        page: 0,
        size: 20,
        university_id: 2,
      },
    });
  });

  it('validates a detail response', async () => {
    apiRequestMock.mockResolvedValue(backendItem);

    await expect(getItem(7)).resolves.toEqual(expect.objectContaining({ id: 7 }));
    expect(apiRequestMock).toHaveBeenCalledWith('/items/7');
  });

  it('creates a photo-free item with the exact JSON contract', async () => {
    apiRequestMock.mockResolvedValue(backendItem);

    await expect(createItem(validCreateInput)).resolves.toEqual(
      expect.objectContaining({ id: 7 }),
    );

    expect(apiRequestMock).toHaveBeenCalledWith('/items', {
      method: 'POST',
      body: JSON.stringify({
        type: 'LEND',
        title: 'USB-C 충전기',
        rental_fee: 0,
        rental_unit: '일',
        pickup_location_id: 4,
        description: '정상 작동합니다.',
        precautions: '케이블을 함께 반납해 주세요.',
      }),
    });
  });

  it('updates a photo-free item with the exact JSON contract', async () => {
    apiRequestMock.mockResolvedValue(backendItem);

    await expect(updateItem(7, validCreateInput)).resolves.toEqual(
      expect.objectContaining({ id: 7 }),
    );

    expect(apiRequestMock).toHaveBeenCalledWith('/items/7', {
      method: 'PUT',
      body: expect.stringContaining('"title":"USB-C 충전기"'),
    });
  });

  it('creates an item with native photo parts and no manual multipart header', async () => {
    apiRequestMock.mockResolvedValue(backendItem);

    await createItem({
      ...validCreateInput,
      type: 'BORROW',
      rentalFee: 1000,
      photos: [{
        uri: 'file:///photo.jpg',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
      }],
    });

    const options = apiRequestMock.mock.calls[0][1];
    expect(options).toEqual({ method: 'POST', body: expect.any(FormData) });
    expect(options).not.toHaveProperty('headers.Content-Type');

    const body = options?.body as FormData;
    expect(body.get('type')).toBe('BORROW');
    expect(body.get('rentalFee')).toBe('1000');
    expect(body.get('pickupLocationId')).toBe('4');
    expect(body.getAll('photos')).toHaveLength(1);
  });

  it('rejects a malformed create response instead of returning a partial item', async () => {
    apiRequestMock.mockResolvedValue({ ...backendItem, id: 'bad' });
    await expect(createItem(validCreateInput)).rejects.toThrow('catalog');
  });

  it('uses POST to add and DELETE to remove a wishlist', async () => {
    apiRequestMock.mockResolvedValue(undefined);

    await setWishlist(7, true);
    await setWishlist(7, false);

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, '/items/7/wishlist', { method: 'POST' });
    expect(apiRequestMock).toHaveBeenNthCalledWith(2, '/items/7/wishlist', { method: 'DELETE' });
  });

  it('deletes an owned item with the item endpoint', async () => {
    apiRequestMock.mockResolvedValue(undefined);

    await deleteItem(7);

    expect(apiRequestMock).toHaveBeenCalledWith('/items/7', { method: 'DELETE' });
  });

  it('loads and validates recommendation history', async () => {
    apiRequestMock.mockResolvedValue([recommendationPayload]);

    await expect(getRecommendationHistory()).resolves.toEqual([
      expect.objectContaining({ id: 12, items: [expect.objectContaining({ id: 7 })] }),
    ]);
    expect(apiRequestMock).toHaveBeenCalledWith('/recommendations/me');
  });

  it('creates a recommendation with the web-equivalent request keys', async () => {
    apiRequestMock.mockResolvedValue(recommendationPayload);

    await createRecommendation({
      department: '컴퓨터공학과',
      interestItems: ['삼각대'],
      timePeriod: '오후',
      isExamPeriod: false,
      weatherStatus: '알 수 없음',
    });

    expect(apiRequestMock).toHaveBeenCalledWith('/recommendations', {
      method: 'POST',
      body: JSON.stringify({
        department: '컴퓨터공학과',
        interest_items: ['삼각대'],
        time_period: '오후',
        is_exam_period: false,
        weather_status: '알 수 없음',
      }),
    });
  });

  it('rejects malformed successful data instead of returning partial items', async () => {
    apiRequestMock.mockResolvedValue({ ...backendItem, id: 'bad' });
    await expect(getItem(7)).rejects.toThrow('catalog');
  });
});
