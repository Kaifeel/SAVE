import { describe, expect, it } from 'vitest'
import {
  mergeChatListUpdate,
  mergeChatRoomSnapshot,
  normalizeChatRoom,
  normalizeMessagesResponse,
  normalizeItem,
  normalizePublicReview,
  normalizePublicUserProfile,
  normalizeRental,
  toCreateItemPayload,
} from './normalizers'
import * as normalizers from './normalizers.js'
import { normalizeItem as normalizeItemDirect } from './normalizers/items.js'
import { normalizeChatRoom as normalizeChatRoomDirect } from './normalizers/chat.js'

describe('normalizer compatibility barrel', () => {
  it('re-exports the same domain functions', () => {
    expect(normalizers.normalizeItem).toBe(normalizeItemDirect)
    expect(normalizers.normalizeChatRoom).toBe(normalizeChatRoomDirect)
  })
})

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
      owner_rating: 4.8,
      review_count: 12,
      precautions: '사용 후 물기를 닦아주세요.',
      view_count: 31,
      wishlisted: true,
      status: 'AVAILABLE',
      created_at: '2026-08-06T02:55:00Z',
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
      rating: 4.8,
      reviews: 12,
      precautions: '사용 후 물기를 닦아주세요.',
      viewCount: 31,
      wishlisted: true,
      status: 'available',
      createdAt: '2026-08-06T02:55:00Z',
    })
  })

  it('does not invent a university or pickup location when the API omits them', () => {
    expect(normalizeItem({ id: 9, title: '우산' })).toMatchObject({
      university: '',
      location: '위치 정보 없음',
    })
  })

  it('preserves a camel-case item creation timestamp', () => {
    expect(normalizeItem({
      id: 8,
      title: '충전기',
      createdAt: '2026-08-06T11:58:00+09:00',
    })).toMatchObject({
      createdAt: '2026-08-06T11:58:00+09:00',
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

describe('public user profile normalization', () => {
  it('maps only the public profile response fields', () => {
    expect(normalizePublicUserProfile({
      id: 9,
      name: '김소유',
      department: '컴퓨터공학과',
      university_id: 1,
      university_name: '부경대학교',
      profile_image_url: '/profiles/9.png',
      rating: 0,
      review_count: 0,
      completed_trade_count: 12,
    })).toEqual({
      id: 9,
      name: '김소유',
      department: '컴퓨터공학과',
      universityId: 1,
      universityName: '부경대학교',
      profileImageUrl: '/profiles/9.png',
      rating: 0,
      reviewCount: 0,
      completedTradeCount: 12,
    })
  })
})

describe('rental review normalization', () => {
  it('maps rental workflow fields without removing role ids', () => {
    expect(normalizeRental({
      id: 3,
      item_id: 7,
      borrower_id: 2,
      lender_id: 1,
      status: 'RETURNED',
      returned_at: '2026-08-06T03:00:00Z',
      review_deadline: '2026-08-13T03:00:00Z',
      review_state: 'AVAILABLE',
    })).toMatchObject({
      id: 3,
      item_id: 7,
      borrower_id: 2,
      lender_id: 1,
      returnedAt: '2026-08-06T03:00:00Z',
      reviewDeadline: '2026-08-13T03:00:00Z',
      reviewState: 'AVAILABLE',
    })
  })

  it('maps a public review card response', () => {
    expect(normalizePublicReview({
      id: 9,
      rating: 5,
      content: '좋은 거래였어요.',
      created_at: '2026-08-07T03:00:00Z',
      item_id: 7,
      item_title: '우산',
      reviewer_id: 2,
      reviewer_name: '김학생',
      reviewer_profile_image_url: '/profiles/2.png',
      reviewee_role: 'LENDER',
    })).toEqual({
      id: 9,
      rating: 5,
      content: '좋은 거래였어요.',
      createdAt: '2026-08-07T03:00:00Z',
      itemId: 7,
      itemTitle: '우산',
      reviewerId: 2,
      reviewerName: '김학생',
      reviewerProfileImageUrl: '/profiles/2.png',
      revieweeRole: 'LENDER',
    })
  })
})

describe('chat room API normalization', () => {
  it('normalizes a cursor-based message page', () => {
    expect(normalizeMessagesResponse({
      messages: [
        { id: 12, sender_id: 2, message: '오래된 메시지' },
        { id: 13, sender_id: 1, message: '최신 메시지' },
      ],
      next_before: 12,
      has_more: true,
    }, 1)).toEqual({
      messages: [
        expect.objectContaining({ id: 12, sender: 'other', text: '오래된 메시지' }),
        expect.objectContaining({ id: 13, sender: 'me', text: '최신 메시지' }),
      ],
      nextBefore: 12,
      hasMore: true,
    })
  })

  it('keeps room metadata when a creation response contains an item summary', () => {
    expect(normalizeChatRoom({
      chat_room_id: 15,
      item: {
        id: 7,
        title: 'Camera',
        rental_fee: 2000,
        rental_unit: 'DAY',
        status: 'AVAILABLE',
      },
      borrower_id: 3,
      lender_id: 9,
      created_at: '2026-08-02T01:00:00',
    })).toMatchObject({
      id: 15,
      roomId: 15,
      itemId: 7,
      itemTitle: 'Camera',
    })
  })

  it('moves a realtime room update to the top and resets unread for the active room', () => {
    const rooms = [
      { id: 1, lastMessage: '이전 메시지', unreadCount: 2, messages: [{ id: 10 }] },
      { id: 2, lastMessage: '다른 방', unreadCount: 0, messages: [] },
    ]

    expect(mergeChatListUpdate(rooms, {
      chat_room_id: 1,
      item_id: 7,
      item_title: '우산',
      opponent_name: '김학생',
      last_message: '방금 온 메시지',
      last_message_at: '2026-08-03T13:20:00',
      unread_count: 3,
    }, 1)).toEqual([
      expect.objectContaining({
        id: 1,
        lastMessage: '방금 온 메시지',
        unreadCount: 0,
        unread: false,
        messages: [{ id: 10 }],
      }),
      rooms[1],
    ])
  })

  it('keeps a newer realtime update when an older REST snapshot resolves later', () => {
    const currentRooms = [{
      id: 1,
      roomId: 1,
      lastMessage: '실시간 새 메시지',
      time: '2026-08-03T13:30:00',
      unreadCount: 2,
      messages: [{ id: 21 }],
    }]

    expect(mergeChatRoomSnapshot(currentRooms, [{
      chat_room_id: 1,
      item_id: 7,
      item_title: '우산',
      last_message: 'REST의 이전 메시지',
      last_message_at: '2026-08-03T13:20:00',
      unread_count: 1,
    }])).toEqual([
      expect.objectContaining({
        id: 1,
        lastMessage: '실시간 새 메시지',
        unreadCount: 2,
        messages: [{ id: 21 }],
      }),
    ])
  })
})
