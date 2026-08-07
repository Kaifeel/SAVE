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

it('submits a review and reloads rental workflow state', async () => {
  const api = {
    getMyRentals: vi.fn().mockResolvedValue([]),
    submitRentalReview: vi.fn().mockResolvedValue({ review_state: 'SUBMITTED_WAITING' }),
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

  await act(async () => {
    await result.current.submitReview(3, { rating: 5, content: '좋았어요.' })
  })

  expect(api.submitRentalReview).toHaveBeenCalledWith(
    3, { rating: 5, content: '좋았어요.' }, 'jwt',
  )
  expect(api.getMyRentals).toHaveBeenCalledTimes(2)
  expect(onRentalChanged).toHaveBeenCalledTimes(1)
  expect(result.current.pendingAction).toBeNull()
})
