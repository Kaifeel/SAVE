const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const unauthorizedListeners = new Set()

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'API_ERROR', data } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.data = data
  }
}

export function subscribeUnauthorized(listener) {
  unauthorizedListeners.add(listener)
  return () => unauthorizedListeners.delete(listener)
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

  let res
  try {
    res = await fetch(buildUrl(path, params), {
      ...fetchOptions,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      credentials: 'include',
    })
  } catch (cause) {
    throw new ApiError('서버에 연결할 수 없습니다.', {
      code: 'NETWORK_ERROR',
      data: { cause: cause instanceof Error ? cause.message : String(cause) },
    })
  }

  const data = await parseResponse(res)

  if (!res.ok) {
    const code = res.status === 401 ? 'UNAUTHORIZED' : `HTTP_${res.status}`
    if (res.status === 401) {
      unauthorizedListeners.forEach(listener => listener())
    }
    throw new ApiError(data?.message || 'API 요청에 실패했습니다.', {
      status: res.status,
      code,
      data,
    })
  }

  return data
}
