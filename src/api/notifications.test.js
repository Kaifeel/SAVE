import { afterEach, expect, it, vi } from 'vitest'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  normalizeNotification,
} from './notifications'

afterEach(() => {
  vi.unstubAllGlobals()
})

it('normalizes a persisted notification for the bell UI', () => {
  expect(normalizeNotification({
    id: 3,
    type: 'RENTAL_APPROVED',
    rental_id: 7,
    item_id: 9,
    title: '대여 요청 승인',
    content: '승인되었습니다.',
    read: false,
    created_at: '2026-08-03T12:00:00',
  })).toMatchObject({
    id: 3,
    type: 'RENTAL_APPROVED',
    rentalId: 7,
    itemId: 9,
    title: '대여 요청 승인',
    text: '승인되었습니다.',
    read: false,
  })
})

it('loads notifications and sends authenticated read requests', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ id: 3, read: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
  vi.stubGlobal('fetch', fetchMock)

  await getNotifications('jwt')
  await markNotificationRead(3, 'jwt')
  await markAllNotificationsRead('jwt')

  expect(fetchMock).toHaveBeenNthCalledWith(1, expect.stringMatching(/\/notifications$/), expect.objectContaining({
    method: 'GET',
    headers: expect.objectContaining({ Authorization: 'Bearer jwt' }),
  }))
  expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringMatching(/\/notifications\/3\/read$/), expect.objectContaining({
    method: 'PATCH',
  }))
  expect(fetchMock).toHaveBeenNthCalledWith(3, expect.stringMatching(/\/notifications\/read-all$/), expect.objectContaining({
    method: 'PATCH',
  }))
})
