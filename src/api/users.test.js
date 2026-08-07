import { beforeEach, expect, it, vi } from 'vitest'
import { apiFetch } from './client'
import { getPublicUserReviews } from './users'

vi.mock('./client', () => ({ apiFetch: vi.fn() }))

beforeEach(() => vi.clearAllMocks())

it('loads only published reviews for a public profile', async () => {
  apiFetch.mockResolvedValue([])

  await getPublicUserReviews(12, 'jwt')

  expect(apiFetch).toHaveBeenCalledWith('/users/12/reviews', { accessToken: 'jwt' })
})
