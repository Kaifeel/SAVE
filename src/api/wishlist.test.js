import { afterEach, expect, it, vi } from 'vitest'
import { addWishlist, removeWishlist } from './wishlist'

afterEach(() => vi.unstubAllGlobals())

it('skips wishlist network requests when API mode is disabled', async () => {
  const fetchMock = vi.fn(() => Promise.reject(new Error('network must not be called')))
  vi.stubGlobal('fetch', fetchMock)

  await expect(addWishlist(7, null, { enabled: false })).resolves.toBeNull()
  await expect(removeWishlist(7, null, { enabled: false })).resolves.toBeNull()
  expect(fetchMock).not.toHaveBeenCalled()
})
