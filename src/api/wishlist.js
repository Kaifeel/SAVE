import { apiFetch } from './client'

export function addWishlist(itemId, accessToken) {
  return apiFetch(`/items/${itemId}/wishlist`, {
    method: 'POST',
    accessToken,
  })
}

export function removeWishlist(itemId, accessToken) {
  return apiFetch(`/items/${itemId}/wishlist`, {
    method: 'DELETE',
    accessToken,
  })
}
