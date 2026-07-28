import { apiFetch } from './client'

export function getUniversities() {
  return apiFetch('/universities')
}

export function getPickupLocations(universityId) {
  return apiFetch(`/universities/${universityId}/pickup-locations`)
}
