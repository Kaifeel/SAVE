import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch, subscribeUnauthorized } from './client'
import { useAuthStore } from '../store/authStore.js'

afterEach(() => {
  useAuthStore.getState().clearSession()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('apiFetch', () => {
  it('publishes one unauthorized event for a 401 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ message: 'expired' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    )))
    const listener = vi.fn()
    const unsubscribe = subscribeUnauthorized(listener)

    await expect(apiFetch('/users/me')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      code: 'UNAUTHORIZED',
    })
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('normalizes a network failure without publishing unauthorized', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    const listener = vi.fn()
    const unsubscribe = subscribeUnauthorized(listener)

    await expect(apiFetch('/items')).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
      code: 'NETWORK_ERROR',
    })
    expect(listener).not.toHaveBeenCalled()
    unsubscribe()
  })

  it('shares one refresh and retries concurrent protected requests with the new token', async () => {
    useAuthStore.getState().setSession({ access_token: 'expired-jwt', user: { id: 1 } })
    let refreshCalls = 0
    const protectedCalls = new Map()
    const fetchMock = vi.fn(async url => {
      if (String(url).endsWith('/auth/refresh')) {
        refreshCalls += 1
        return new Response(JSON.stringify({
          access_token: 'fresh-jwt',
          user: { id: 1 },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }

      const count = protectedCalls.get(url) || 0
      protectedCalls.set(url, count + 1)
      if (count === 0) {
        return new Response(JSON.stringify({ message: 'expired' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(Promise.all([
      apiFetch('/users/me', { accessToken: 'expired-jwt' }),
      apiFetch('/rentals/me', { accessToken: 'expired-jwt' }),
    ])).resolves.toEqual([{ ok: true }, { ok: true }])

    expect(refreshCalls).toBe(1)
    const refreshRequest = fetchMock.mock.calls.find(([url]) => (
      String(url).endsWith('/auth/refresh')
    ))
    expect(refreshRequest[1].headers.Authorization).toBeUndefined()
    const retriedRequests = fetchMock.mock.calls.filter(([, options]) => (
      options.headers.Authorization === 'Bearer fresh-jwt'
    ))
    expect(retriedRequests).toHaveLength(2)
  })
})
