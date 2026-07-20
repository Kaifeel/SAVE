const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

function buildUrl(path, params) {
  const baseUrl = API_BASE_URL
    ? `${API_BASE_URL.replace(/\/$/, '')}/`
    : `${window.location.origin}/`
  const url = path.startsWith('http')
    ? new URL(path)
    : new URL(path.replace(/^\//, ''), baseUrl)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value)
      }
    })
  }

  return API_BASE_URL ? url.toString() : `${url.pathname}${url.search}`
}

async function parseResponse(res) {
  const contentType = res.headers.get('content-type') || ''

  if (res.status === 204) return null
  if (contentType.includes('application/json')) return res.json()

  const text = await res.text()
  return text || null
}

export async function apiFetch(path, options = {}) {
  const { accessToken, params, headers, ...fetchOptions } = options
  const body = fetchOptions.body
  const isFormData = body instanceof FormData

  const res = await fetch(buildUrl(path, params), {
    ...fetchOptions,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    credentials: 'include',
  })

  const data = await parseResponse(res)

  if (!res.ok) {
    throw new ApiError(data?.message || 'API 요청에 실패했습니다.', {
      status: res.status,
      data,
    })
  }

  return data
}
