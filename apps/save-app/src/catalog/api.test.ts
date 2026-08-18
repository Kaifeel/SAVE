import { apiRequest } from '@/api/client';
import {
  createRecommendation,
  getItem,
  getRecommendationHistory,
  listItems,
  setWishlist,
} from './api';
import { backendItem } from './schema.test';

jest.mock('@/api/client', () => ({
  apiRequest: jest.fn(),
}));

const apiRequestMock = apiRequest as jest.MockedFunction<typeof apiRequest>;
const pagePayload = {
  content: [backendItem],
  pageable: { pageNumber: 0, pageSize: 20 },
  totalElements: 1,
};

const recommendationPayload = {
  recommendationId: 12,
  headline: '오늘 필요한 물품',
  recommendationReasons: ['학과 맞춤'],
  recommendedKeywords: ['삼각대'],
  recommendedItems: [backendItem],
  department: '컴퓨터공학과',
  interestItems: ['삼각대'],
  timePeriod: '오후',
  isExamPeriod: false,
  weatherStatus: '알 수 없음',
  createdAt: '2026-08-18T10:00:00',
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

  it('uses POST to add and DELETE to remove a wishlist', async () => {
    apiRequestMock.mockResolvedValue(undefined);

    await setWishlist(7, true);
    await setWishlist(7, false);

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, '/items/7/wishlist', { method: 'POST' });
    expect(apiRequestMock).toHaveBeenNthCalledWith(2, '/items/7/wishlist', { method: 'DELETE' });
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
