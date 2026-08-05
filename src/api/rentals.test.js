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
