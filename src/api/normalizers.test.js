import { describe, expect, it } from 'vitest'
import { normalizeItem, toCreateItemPayload } from './normalizers'

describe('item API normalization', () => {
  it('maps the canonical Spring item response without fallback values', () => {
    expect(normalizeItem({
      id: 7,
      owner_id: 9,
      owner_name: '김소유',
      type: 'LEND',
      title: '튼튼한 우산',
      rental_fee: 1200,
      rental_unit: 'DAY',
      pickup_location_id: 3,
      pickup_location_name: '누리관 앞',
      owner_university_id: 1,
      owner_university_name: '부경대학교',
      main_image_url: '/main.png',
      image_urls: ['/main.png', '/detail.png'],
      wishlist_count: 4,
      wishlisted: true,
      status: 'AVAILABLE',
    })).toMatchObject({
      id: 7,
      ownerId: 9,
      owner: '김소유',
      price: 1200,
      priceType: '일',
      pickupLocationId: 3,
      location: '누리관 앞',
      universityId: 1,
      university: '부경대학교',
      photos: ['/main.png', '/detail.png'],
      mainImageUrl: '/main.png',
      wishlistCount: 4,
      wishlisted: true,
      status: 'available',
    })
  })

  it('creates only canonical item request fields', () => {
    expect(toCreateItemPayload({
      title: '우산',
      price: '1000',
      priceType: '일',
      pickupLocationId: 3,
      type: 'rent',
      description: '깨끗함',
    })).toEqual({
      title: '우산',
      rental_fee: 1000,
      rental_unit: 'DAY',
      pickup_location_id: 3,
      type: 'LEND',
      description: '깨끗함',
      precautions: '',
      photos: [],
    })
  })
})
