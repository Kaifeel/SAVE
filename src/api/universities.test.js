import { afterEach, describe, expect, it, vi } from 'vitest'
import { getPickupLocations, getUniversities } from './universities'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('university reference transport', () => {
  it('loads the public university list', async () => {
    const universities = [{ id: 1, name: '부경대학교' }]
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify(universities),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getUniversities()).resolves.toEqual(universities)
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/universities$/)
  })

  it('uses the selected university id for pickup locations', async () => {
    const locations = [{ id: 3, name: '누리관 앞' }]
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify(locations),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getPickupLocations(2)).resolves.toEqual(locations)
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/universities\/2\/pickup-locations$/)
  })
})
