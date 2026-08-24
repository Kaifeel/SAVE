import { act, renderHook, waitFor } from '@testing-library/react-native';

import { catalogItem } from '@/test-utils/catalog-fixtures';
import { getMyItems, getMyProfile, getMyWishlist } from './api';
import { useMyPage } from './use-my-page';

jest.mock('./api', () => ({
  getMyItems: jest.fn(),
  getMyProfile: jest.fn(),
  getMyWishlist: jest.fn(),
}));

const profile = {
  id: 17, email: 'user@example.com', name: '이용자', department: null,
  universityId: 1, universityName: '부경대학교', profileImageUrl: null, role: 'USER' as const,
};
const profileMock = jest.mocked(getMyProfile);
const itemsMock = jest.mocked(getMyItems);
const wishlistMock = jest.mocked(getMyWishlist);

beforeEach(() => {
  jest.clearAllMocks();
  profileMock.mockResolvedValue(profile);
  itemsMock.mockResolvedValue([catalogItem]);
  wishlistMock.mockResolvedValue([]);
});

it('loads profile, owned items, and wishlist without fabricated fallbacks', async () => {
  const { result } = await renderHook(useMyPage);
  await waitFor(() => expect(result.current.profile.loading).toBe(false));

  expect(result.current.profile.data).toEqual(profile);
  expect(result.current.items.data).toEqual([catalogItem]);
  expect(result.current.wishlist.data).toEqual([]);
});

it('keeps successful sections when one resource fails and retries only that section', async () => {
  wishlistMock.mockRejectedValueOnce(new Error('찜 서버 실패')).mockResolvedValueOnce([catalogItem]);
  const { result } = await renderHook(useMyPage);
  await waitFor(() => expect(result.current.wishlist.error).toBe('찜 서버 실패'));

  expect(result.current.items.data).toEqual([catalogItem]);
  await act(async () => { await result.current.reload('wishlist'); });
  expect(result.current.wishlist.data).toEqual([catalogItem]);
  expect(profileMock).toHaveBeenCalledTimes(1);
});
