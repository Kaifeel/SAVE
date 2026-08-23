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

it('creates a mock rental locally without calling the rental API', async () => {
  const api = {
    getMyRentals: vi.fn(),
    createRental: vi.fn(),
  }
  const { result } = renderHook(() => useRentals({
    accessToken: null,
    currentUserId: 3,
    enabled: false,
    api,
  }))

  await act(() => result.current.create({
    item_id: 7,
    chat_room_id: null,
    start_date: '2026-08-24T01:00:00.000Z',
    end_date: '2026-08-25T01:00:00.000Z',
    total_price: 1000,
  }))

  expect(result.current.rentals).toEqual([
    expect.objectContaining({
      item_id: 7,
      borrower_id: 3,
      status: 'REQUESTED',
      total_price: 1000,
    }),
  ])
  expect(api.createRental).not.toHaveBeenCalled()
})

it('updates mock rental transitions locally without calling the rental API', async () => {
  const api = {
    getMyRentals: vi.fn(),
    createRental: vi.fn(),
    cancelRental: vi.fn(),
  }
  const { result } = renderHook(() => useRentals({
    accessToken: null,
    currentUserId: 3,
    enabled: false,
    api,
  }))

  let created
  await act(async () => {
    created = await result.current.create({ item_id: 7 })
  })
  await act(() => result.current.transition(created.id, 'cancelRental'))

  expect(result.current.rentals[0].status).toBe('CANCELED')
  expect(api.cancelRental).not.toHaveBeenCalled()
})

it('stores a mock review locally without calling the rental API', async () => {
  const api = {
    getMyRentals: vi.fn(),
    createRental: vi.fn(),
    returnRental: vi.fn(),
    submitRentalReview: vi.fn(),
  }
  const { result } = renderHook(() => useRentals({
    accessToken: null,
    currentUserId: 3,
    enabled: false,
    api,
  }))

  let created
  await act(async () => {
    created = await result.current.create({ item_id: 7 })
  })
  await act(() => result.current.transition(created.id, 'returnRental'))
  await act(() => result.current.submitReview(created.id, { rating: 5, content: '좋았어요.' }))

  expect(result.current.rentals[0]).toMatchObject({
    status: 'RETURNED',
    reviewState: 'SUBMITTED_WAITING',
  })
  expect(api.returnRental).not.toHaveBeenCalled()
  expect(api.submitRentalReview).not.toHaveBeenCalled()
})
