import { apiRequest } from '@/api/client';
import { backendItem } from '@/catalog/schema.test';
import { getMyItems, getMyProfile, getMyWishlist } from './api';

jest.mock('@/api/client', () => ({ apiRequest: jest.fn() }));
const request = jest.mocked(apiRequest);

const profile = {
  id: 17,
  email: 'user@example.com',
  name: '이용자',
  department: null,
  university_id: 1,
  university_name: '부경대학교',
  profile_image_url: null,
  role: 'USER',
};

it('loads and validates every My Page resource independently', async () => {
  request
    .mockResolvedValueOnce(profile)
    .mockResolvedValueOnce([backendItem])
    .mockResolvedValueOnce([]);

  await expect(getMyProfile()).resolves.toEqual(expect.objectContaining({ id: 17 }));
  await expect(getMyItems()).resolves.toHaveLength(1);
  await expect(getMyWishlist()).resolves.toEqual([]);
  expect(request.mock.calls.map(call => call[0])).toEqual([
    '/users/me', '/users/me/items', '/users/me/wishlist',
  ]);
});

it('does not accept an object as an item-list fallback', async () => {
  request.mockResolvedValue({ content: [] });
  await expect(getMyItems()).rejects.toThrow('Invalid my items response');
});
