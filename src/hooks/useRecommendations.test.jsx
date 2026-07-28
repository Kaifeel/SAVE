import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMyRecommendationHistory, getRecommendations } from '../api/recommendations'
import { useRecommendations } from './useRecommendations'

vi.mock('../api/recommendations', () => ({
  getRecommendations: vi.fn(),
  getMyRecommendationHistory: vi.fn(),
}))

describe('useRecommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMyRecommendationHistory.mockResolvedValue([])
    getRecommendations.mockResolvedValue({
      headline: '추천',
      recommended_items: [],
    })
  })

  it('sends actual wishlist titles as non-empty recommendation interests', async () => {
    const { result } = renderHook(() => useRecommendations({
      accessToken: 'token',
      enabled: true,
      department: '컴퓨터공학과',
      interestItems: ['충전기', '아이패드'],
    }))

    await act(() => result.current.refresh())

    expect(getRecommendations).toHaveBeenCalledWith(
      expect.objectContaining({
        department: '컴퓨터공학과',
        interest_items: ['충전기', '아이패드'],
      }),
      'token',
    )
    await waitFor(() => expect(result.current.current?.headline).toBe('추천'))
  })
})
