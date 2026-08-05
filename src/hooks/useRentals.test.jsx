import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useRentals } from './useRentals'

it('locks a transition and refreshes related screens after server success', async () => {
  let finishStart
  const api = {
    getMyRentals: vi.fn().mockResolvedValue([]),
    startRental: vi.fn().mockImplementation(() => new Promise(resolve => {
      finishStart = resolve
    })),
  }
  const onRentalChanged = vi.fn().mockResolvedValue(undefined)
  const { result } = renderHook(() => useRentals({
    accessToken: 'jwt',
    currentUserId: 2,
    enabled: true,
    api,
    onRentalChanged,
  }))
  await waitFor(() => expect(result.current.loading).toBe(false))

  let transitionPromise
  act(() => {
    transitionPromise = result.current.transition(3, 'startRental')
  })
  expect(result.current.pendingAction).toBe('3:startRental')

  await act(async () => {
    finishStart({ id: 3, status: 'RENTING' })
    await transitionPromise
  })

  expect(api.startRental).toHaveBeenCalledWith(3, 'jwt')
  expect(api.getMyRentals).toHaveBeenCalledTimes(2)
  expect(onRentalChanged).toHaveBeenCalledTimes(1)
  expect(result.current.pendingAction).toBeNull()
})
