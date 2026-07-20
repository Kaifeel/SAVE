import { apiFetch } from './client'

export function getRecommendations(data, accessToken) {
  return apiFetch('/recommendations', {
    method: 'POST',
    accessToken,
    body: JSON.stringify(data),
  })
}

export function getMyRecommendationHistory(accessToken) {
  return apiFetch('/recommendations/me', {
    method: 'GET',
    accessToken,
  })
}

export function getRecommendationDetail(recommendationId, accessToken) {
  return apiFetch(`/recommendations/${recommendationId}`, {
    method: 'GET',
    accessToken,
  })
}
