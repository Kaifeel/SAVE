import { apiFetch } from './client'

export function addWishlist(itemId, accessToken, { enabled = true } = {}) {
  if (!enabled) return Promise.resolve(null)
  return apiFetch(`/items/${itemId}/wishlist`, {
    method: 'POST',
    accessToken,
  })
}

export function removeWishlist(itemId, accessToken, { enabled = true } = {}) {
  if (!enabled) return Promise.resolve(null)
  return apiFetch(`/items/${itemId}/wishlist`, {
    method: 'DELETE',
    accessToken,
  })
}
