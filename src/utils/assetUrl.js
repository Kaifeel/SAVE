const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export function resolveAssetUrl(value, apiBaseUrl = API_BASE_URL) {
  if (!value || typeof value !== 'string') return ''
  if (/^(https?:|data:|blob:)/i.test(value)) return value
  if (!value.startsWith('/uploads/')) return value
  if (!apiBaseUrl) return value

  try {
    const apiUrl = new URL(apiBaseUrl)
    // Local HTTP API origins are blocked by the web CSP. Keep uploads same-origin
    // and let the Vite/deployment proxy forward them to the API server.
    if (apiUrl.protocol === 'http:') return value
    return new URL(value, apiUrl.origin).toString()
  } catch {
    return value
  }
}

export function itemPhotoUrl(item) {
  return resolveAssetUrl(item?.mainImageUrl || item?.photos?.[0])
}
