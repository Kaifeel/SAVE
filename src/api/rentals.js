import { apiFetch } from './client'
import { normalizeRental } from './normalizers'

function normalizeRentalResponse(response) {
  return normalizeRental(response)
}

export async function createRental(data, accessToken) {
  return normalizeRentalResponse(await apiFetch('/rentals', {
    method: 'POST',
    accessToken,
    body: JSON.stringify(data),
  }))
}

export async function getMyRentals(accessToken) {
  const response = await apiFetch('/rentals/me', {
    method: 'GET',
    accessToken,
  })
  return (Array.isArray(response) ? response : []).map(normalizeRental)
}

export async function getRentalDetail(rentalId, accessToken) {
  return normalizeRentalResponse(await apiFetch(`/rentals/${rentalId}`, {
    method: 'GET',
    accessToken,
  }))
}

export async function rejectRental(rentalId, accessToken) {
  return normalizeRentalResponse(await apiFetch(`/rentals/${rentalId}/reject`, {
    method: 'PATCH',
    accessToken,
  }))
}

export async function cancelRental(rentalId, accessToken) {
  return normalizeRentalResponse(await apiFetch(`/rentals/${rentalId}/cancel`, {
    method: 'PATCH',
    accessToken,
  }))
}

export async function returnRental(rentalId, accessToken) {
  return normalizeRentalResponse(await apiFetch(`/rentals/${rentalId}/return`, {
    method: 'PATCH',
    accessToken,
  }))
}

export async function startRental(rentalId, accessToken) {
  return normalizeRentalResponse(await apiFetch(`/rentals/${rentalId}/start`, {
    method: 'PATCH',
    accessToken,
  }))
}

export async function submitRentalReview(rentalId, review, accessToken) {
  return apiFetch(`/rentals/${rentalId}/reviews`, {
    method: 'POST',
    accessToken,
    body: JSON.stringify(review),
  })
}
