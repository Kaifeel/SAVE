import { apiFetch } from './client'

export function createRental(data, accessToken) {
  return apiFetch('/rentals', {
    method: 'POST',
    accessToken,
    body: JSON.stringify(data),
  })
}

export function getMyRentals(accessToken) {
  return apiFetch('/rentals/me', {
    method: 'GET',
    accessToken,
  })
}

export function getRentalDetail(rentalId, accessToken) {
  return apiFetch(`/rentals/${rentalId}`, {
    method: 'GET',
    accessToken,
  })
}

export function approveRental(rentalId, accessToken) {
  return apiFetch(`/rentals/${rentalId}/approve`, {
    method: 'PATCH',
    accessToken,
  })
}

export function rejectRental(rentalId, accessToken) {
  return apiFetch(`/rentals/${rentalId}/reject`, {
    method: 'PATCH',
    accessToken,
  })
}

export function cancelRental(rentalId, accessToken) {
  return apiFetch(`/rentals/${rentalId}/cancel`, {
    method: 'PATCH',
    accessToken,
  })
}

export function returnRental(rentalId, accessToken) {
  return apiFetch(`/rentals/${rentalId}/return`, {
    method: 'PATCH',
    accessToken,
  })
}

export function markRentalPaid(rentalId, accessToken) {
  return apiFetch(`/rentals/${rentalId}/paid`, {
    method: 'PATCH',
    accessToken,
  })
}

export function startRental(rentalId, accessToken) {
  return apiFetch(`/rentals/${rentalId}/start`, {
    method: 'PATCH',
    accessToken,
  })
}
