import { renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useUserProfile } from './useUserProfile'

it('loads and normalizes a public profile with its visible items', async () => {
  const api = {
    getPublicUserProfile: vi.fn().mockResolvedValue({
      id: 12,
      name: '작성자',
      university_name: '부경대학교',
      rating: 0,
      review_count: 0,
      completed_trade_count: 3,
    }),
    getPublicUserItems: vi.fn().mockResolvedValue([{
      id: 7,
      owner_id: 12,
      owner_name: '작성자',
      title: '우산',
      rental_fee: 1000,
      rental_unit: 'DAY',
      status: 'AVAILABLE',
    }]),
  }

  const { result } = renderHook(() => useUserProfile({
    userId: 12,
    accessToken: 'token',
    api,
  }))

  await waitFor(() => expect(result.current.loading).toBe(false))

  expect(api.getPublicUserProfile).toHaveBeenCalledWith(12, 'token')
  expect(api.getPublicUserItems).toHaveBeenCalledWith(12, 'token')
  expect(result.current.profile).toMatchObject({
    id: 12,
    name: '작성자',
    universityName: '부경대학교',
    rating: 0,
    reviewCount: 0,
    completedTradeCount: 3,
  })
  expect(result.current.items[0]).toMatchObject({
    id: 7,
    ownerId: 12,
    title: '우산',
    priceType: '일',
  })
})
