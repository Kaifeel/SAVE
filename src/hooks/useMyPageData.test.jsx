import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useMyPageData } from './useMyPageData'

it('reloads all My Page sections on demand', async () => {
  const api = {
    getMyInfo: vi.fn().mockResolvedValue({ id: 1 }),
    getMyItems: vi.fn().mockResolvedValue([]),
    getMyWishlist: vi.fn().mockResolvedValue([]),
    getMyRentals: vi.fn().mockResolvedValue([]),
  }
  const { result } = renderHook(() => useMyPageData({
    accessToken: 'jwt', enabled: true, api,
  }))
  await waitFor(() => expect(result.current.profile.loading).toBe(false))

  await act(async () => result.current.reload())

  expect(api.getMyInfo).toHaveBeenCalledTimes(2)
  expect(api.getMyItems).toHaveBeenCalledTimes(2)
  expect(api.getMyWishlist).toHaveBeenCalledTimes(2)
  expect(api.getMyRentals).toHaveBeenCalledTimes(2)
})
