import { apiFetch } from './client'

export function getMyInfo(accessToken) {
  return apiFetch('/users/me', { accessToken })
}

export function updateMyProfile(profile, accessToken) {
  return apiFetch('/users/me/profile', {
    method: 'PUT',
    accessToken,
    body: JSON.stringify(profile),
  })
}

export function getMyItems(accessToken) {
  return apiFetch('/users/me/items', { accessToken })
}

export function getMyWishlist(accessToken) {
  return apiFetch('/users/me/wishlist', { accessToken })
}
