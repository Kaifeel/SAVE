import { afterEach, describe, expect, it, vi } from 'vitest'
import { createItem, getItems } from './items'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('items transport', () => {
  it('sends the canonical JSON body unchanged', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ id: 1 }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    ))
    vi.stubGlobal('fetch', fetchMock)
    const payload = {
      title: '우산',
      type: 'LEND',
      rental_fee: 1000,
      rental_unit: 'DAY',
      pickup_location_id: 3,
      description: '깨끗함',
      precautions: '',
      photos: [],
    }

    await createItem(payload, 'jwt')

    const [, request] = fetchMock.mock.calls[0]
    expect(JSON.parse(request.body)).toEqual({
      title: '우산',
      type: 'LEND',
      rental_fee: 1000,
      rental_unit: 'DAY',
      pickup_location_id: 3,
      description: '깨끗함',
      precautions: '',
    })
  })

  it('uses JavaBean field names when photos switch the request to multipart', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ id: 1 }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    ))
    vi.stubGlobal('fetch', fetchMock)
    const photo = new File(['image-bytes'], 'umbrella.jpg', { type: 'image/jpeg' })

    await createItem({
      title: '우산',
      type: 'LEND',
      rental_fee: 1000,
      rental_unit: 'DAY',
      pickup_location_id: 3,
      description: '깨끗함',
      precautions: '분실 주의',
      photos: [photo],
    }, 'jwt')

    const [, request] = fetchMock.mock.calls[0]
    expect(request.body).toBeInstanceOf(FormData)
    expect(request.body.get('rentalFee')).toBe('1000')
    expect(request.body.get('rentalUnit')).toBe('DAY')
    expect(request.body.get('pickupLocationId')).toBe('3')
    expect(request.body.get('rental_fee')).toBeNull()
    expect(request.body.get('photos')).toBe(photo)
    expect(request.headers).not.toHaveProperty('Content-Type')
  })

  it('uses university_id as the list filter', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ content: [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ))
    vi.stubGlobal('fetch', fetchMock)

    await getItems({ university_id: 2 }, 'jwt')

    expect(fetchMock.mock.calls[0][0]).toContain('university_id=2')
  })
})
