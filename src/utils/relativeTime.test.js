import { describe, expect, it } from 'vitest'
import { formatRelativeTime } from './relativeTime'

const NOW = Date.parse('2026-08-06T12:00:00+09:00')

describe('formatRelativeTime', () => {
  it.each([
    ['2026-08-06T11:59:30+09:00', '방금 전'],
    ['2026-08-06T02:55:00Z', '5분 전'],
    ['2026-08-06T10:00:00+09:00', '2시간 전'],
    ['2026-08-03T12:00:00+09:00', '3일 전'],
    ['2026-08-06T12:01:00+09:00', '방금 전'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatRelativeTime(value, NOW)).toBe(expected)
  })

  it.each([undefined, '', 'not-a-date'])('omits invalid value %s', value => {
    expect(formatRelativeTime(value, NOW)).toBe('')
  })
})
