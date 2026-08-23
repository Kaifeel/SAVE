import { describe, expect, it } from 'vitest'
import {
  findLinkedItem,
  formatChatDate,
  formatChatTime,
  getChatDateKey,
  itemStatusMeta,
} from './presentation.js'

describe('chat presentation', () => {
  it('formats valid timestamps and preserves legacy display strings', () => {
    expect(formatChatTime('2026-08-02T12:51:07')).toBe('12:51')
    expect(formatChatTime('어제')).toBe('어제')
    expect(formatChatDate('2026-08-02T12:51:07')).toBe('2026년 8월 2일')
    expect(getChatDateKey('2026-08-02T23:59:59')).toBe('2026-08-02')
    expect(getChatDateKey('invalid')).toBe(null)
  })

  it('uses neutral metadata for an absent or unknown item status', () => {
    expect(itemStatusMeta({ status: 'rented' })).toEqual([
      '대여 중', 'bg-rose-50 text-rose-500',
    ])
    expect(itemStatusMeta({ status: 'unknown' })).toEqual([
      '상태 확인 불가', 'bg-slate-100 text-slate-500',
    ])
    expect(itemStatusMeta(null)).toEqual([
      '상태 확인 불가', 'bg-slate-100 text-slate-500',
    ])
  })

  it('links by item id before falling back to a duplicate title', () => {
    const items = [
      { id: 1, title: '같은 이름' },
      { id: 2, title: '같은 이름' },
    ]

    expect(findLinkedItem(items, { itemId: 2, itemTitle: '같은 이름' })).toBe(items[1])
    expect(findLinkedItem(items, { itemTitle: '같은 이름' })).toBe(items[0])
  })
})
