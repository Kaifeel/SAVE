export function unwrapList(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.items)) return response.items
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.content)) return response.content
  if (Array.isArray(response?.results)) return response.results
  return []
}

export function unwrapObject(response) {
  return response?.data || response?.item || response
}
