import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useReferenceData } from './useReferenceData'

it('loads universities and then locations for the selected university', async () => {
  const api = {
    getUniversities: vi.fn().mockResolvedValue([{ id: 1, name: '부경대학교' }]),
    getPickupLocations: vi.fn().mockResolvedValue([{ id: 3, name: '누리관 앞' }]),
  }
  const { result, rerender } = renderHook(
    ({ universityId }) => useReferenceData({ universityId, api }),
    { initialProps: { universityId: null } },
  )

  await waitFor(() => expect(result.current.universities).toHaveLength(1))
  expect(api.getPickupLocations).not.toHaveBeenCalled()

  await act(() => rerender({ universityId: 1 }))
  await waitFor(() => expect(result.current.pickupLocations).toHaveLength(1))
  expect(api.getPickupLocations).toHaveBeenCalledWith(1)
})

it('exposes a retryable error instead of reference-data fallbacks', async () => {
  const api = {
    getUniversities: vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([{ id: 1, name: '부경대학교' }]),
    getPickupLocations: vi.fn(),
  }
  const { result } = renderHook(() => useReferenceData({ universityId: null, api }))

  await waitFor(() => expect(result.current.error?.message).toBe('offline'))
  await act(() => result.current.reloadUniversities())
  await waitFor(() => expect(result.current.universities).toHaveLength(1))
})
