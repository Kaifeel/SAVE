import { beforeEach, expect, it, vi } from 'vitest'
import * as rentals from './rentals'
import { apiFetch } from './client'

vi.mock('./client', () => ({ apiFetch: vi.fn() }))

beforeEach(() => vi.clearAllMocks())

it('exposes only the offline rental transition endpoints', async () => {
  apiFetch.mockResolvedValue({ id: 3, status: 'RENTING' })

  await rentals.startRental(3, 'jwt')
  await rentals.returnRental(3, 'jwt')

  expect(apiFetch).toHaveBeenNthCalledWith(1, '/rentals/3/start', {
    method: 'PATCH', accessToken: 'jwt',
  })
  expect(apiFetch).toHaveBeenNthCalledWith(2, '/rentals/3/return', {
    method: 'PATCH', accessToken: 'jwt',
  })
  expect(rentals.approveRental).toBeUndefined()
  expect(rentals.markRentalPaid).toBeUndefined()
})

it('submits one star and text review for a returned rental', async () => {
  apiFetch.mockResolvedValue({ review_state: 'SUBMITTED_WAITING' })

  await rentals.submitRentalReview(3, {
    rating: 5,
    content: '약속 시간을 잘 지켜줬어요.',
  }, 'jwt')

  expect(apiFetch).toHaveBeenCalledWith('/rentals/3/reviews', {
    method: 'POST',
    accessToken: 'jwt',
    body: JSON.stringify({ rating: 5, content: '약속 시간을 잘 지켜줬어요.' }),
  })
})
