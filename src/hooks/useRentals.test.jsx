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

it('merges submitted review state before the background reload completes', async () => {
  let finishReload
  const initialRental = { id: 3, borrower_id: 2, reviewState: 'AVAILABLE' }
  const api = {
    getMyRentals: vi.fn()
      .mockResolvedValueOnce([initialRental])
      .mockImplementationOnce(() => new Promise(resolve => { finishReload = resolve })),
    submitRentalReview: vi.fn().mockResolvedValue({
      review_state: 'SUBMITTED_WAITING',
      review_deadline: '2026-08-18T03:00:00Z',
    }),
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

  let submission
  act(() => {
    submission = result.current.submitReview(3, { rating: 5, content: '좋았어요.' })
  })

  await waitFor(() => expect(result.current.rentals[0]).toMatchObject({
    reviewState: 'SUBMITTED_WAITING',
    reviewDeadline: '2026-08-18T03:00:00Z',
  }))

  await act(async () => {
    finishReload([{ ...initialRental, reviewState: 'SUBMITTED_WAITING' }])
    await submission
  })

  expect(api.submitRentalReview).toHaveBeenCalledWith(
    3, { rating: 5, content: '좋았어요.' }, 'jwt',
  )
  expect(api.getMyRentals).toHaveBeenCalledTimes(2)
  expect(onRentalChanged).toHaveBeenCalledTimes(1)
  expect(result.current.pendingAction).toBeNull()
})
