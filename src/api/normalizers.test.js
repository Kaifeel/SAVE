import { describe, expect, it } from 'vitest'
import {
  mergeChatListUpdate,
  mergeChatRoomSnapshot,
  normalizeChatRoom,
  normalizeItem,
  normalizePublicUserProfile,
  toCreateItemPayload,
} from './normalizers'

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
      created_at: '2026-08-06T11:55:00+09:00',
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
      createdAt: '2026-08-06T11:55:00+09:00',
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

describe('chat room API normalization', () => {
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
