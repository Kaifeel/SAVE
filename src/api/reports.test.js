import { expect, it } from 'vitest'
import { normalizeAdminReport } from './reports.js'

it('normalizes the canonical admin report response', () => {
  expect(normalizeAdminReport({
    id: 10,
    reporter_id: 2,
    reporter_name: '신고자',
    reported_user_id: 3,
    reported_user_name: '신고 대상',
    item_id: 7,
    item_title: '허위 게시물',
    chat_room_id: 5,
    reason: '설명과 다릅니다.',
    status: 'REVIEWING',
    created_at: '2026-08-02T12:51:07',
    handled_at: '2026-08-02T13:00:00',
  })).toEqual({
    id: 10,
    reporterId: 2,
    reporterName: '신고자',
    reportedUserId: 3,
    reportedUserName: '신고 대상',
    itemId: 7,
    itemTitle: '허위 게시물',
    chatRoomId: 5,
    reason: '설명과 다릅니다.',
    status: 'REVIEWING',
    createdAt: '2026-08-02T12:51:07',
    handledAt: '2026-08-02T13:00:00',
  })
})
