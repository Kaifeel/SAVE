import { act, renderHook, waitFor } from '@testing-library/react-native';

import { catalogItem } from '@/test-utils/catalog-fixtures';
import { getPublicItems, getPublicProfile, getPublicReviews } from './public-api';
import { usePublicProfile } from './use-public-profile';

jest.mock('./public-api', () => ({
  getPublicItems: jest.fn(),
  getPublicProfile: jest.fn(),
  getPublicReviews: jest.fn(),
}));

const profile = {
  id: 3, name: '김세이브', department: null, universityId: 1,
  universityName: '부경대학교', profileImageUrl: null,
  rating: 4.5, reviewCount: 1, completedTradeCount: 2,
};
const review = {
  id: 9, rating: 5, content: '좋았습니다.', createdAt: '2026-08-24T10:00:00Z',
  itemId: 7, itemTitle: '삼각대', reviewerId: 17, reviewerName: '이용자',
  reviewerProfileImageUrl: null, revieweeRole: 'LENDER' as const,
};
const profileMock = jest.mocked(getPublicProfile);
const itemsMock = jest.mocked(getPublicItems);
const reviewsMock = jest.mocked(getPublicReviews);

beforeEach(() => {
  jest.clearAllMocks();
  profileMock.mockResolvedValue(profile);
  itemsMock.mockResolvedValue([catalogItem]);
  reviewsMock.mockResolvedValue([review]);
});

it('loads all public resources for the route user', async () => {
  const { result } = await renderHook(() => usePublicProfile(3));
  await waitFor(() => expect(result.current.profile.loading).toBe(false));

  expect(result.current.profile.data).toEqual(profile);
  expect(result.current.items.data).toEqual([catalogItem]);
  expect(result.current.reviews.data).toEqual([review]);
  expect(profileMock).toHaveBeenCalledWith(3);
});

it('does not call public endpoints for an invalid route and reloads one failed section', async () => {
  const invalid = await renderHook(() => usePublicProfile(null));
  expect(profileMock).not.toHaveBeenCalled();
  await invalid.unmount();

  reviewsMock.mockRejectedValueOnce(new Error('후기 서버 실패'));
  const hook = await renderHook(() => usePublicProfile(3));
  await waitFor(() => expect(hook.result.current.reviews.error).toBe('후기 서버 실패'));
  await act(async () => { await hook.result.current.reload('reviews'); });
  expect(hook.result.current.reviews.data).toEqual([review]);
  expect(profileMock).toHaveBeenCalledTimes(1);
});
