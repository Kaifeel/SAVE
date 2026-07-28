import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch, subscribeUnauthorized } from './client'

afterEach(() => {
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
})
