import { apiRequest } from '@/api/client';
import { backendItem } from '@/catalog/schema.test';
import { getPublicItems, getPublicProfile, getPublicReviews } from './public-api';

jest.mock('@/api/client', () => ({ apiRequest: jest.fn() }));
const request = jest.mocked(apiRequest);

beforeEach(() => {
  jest.clearAllMocks();
});

const profile = {
  id: 3, name: '김세이브', department: null, university_id: null,
  university_name: null, profile_image_url: null, rating: 0,
  review_count: 0, completed_trade_count: 0,
};

it('uses the three public user endpoints without fallback data', async () => {
  request
    .mockResolvedValueOnce(profile)
    .mockResolvedValueOnce([backendItem])
    .mockResolvedValueOnce([]);

  await expect(getPublicProfile(3)).resolves.toEqual(expect.objectContaining({ id: 3 }));
  await expect(getPublicItems(3)).resolves.toHaveLength(1);
  await expect(getPublicReviews(3)).resolves.toEqual([]);
  expect(request.mock.calls.map(call => call[0])).toEqual([
    '/users/3/profile', '/users/3/items', '/users/3/reviews',
  ]);
});

it('rejects invalid user ids before network access', async () => {
  await expect(getPublicProfile(0)).rejects.toThrow('Invalid public profile user id');
  expect(request).not.toHaveBeenCalled();
});
