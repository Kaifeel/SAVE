import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useNow } from './useNow'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-06T12:00:00+09:00'))
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

it('refreshes once per minute while visible', () => {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  const { result } = renderHook(() => useNow())

  act(() => {
    vi.advanceTimersByTime(60_000)
  })

  expect(result.current).toBe(Date.parse('2026-08-06T12:01:00+09:00'))
})

it('pauses while hidden and refreshes immediately when visible again', () => {
  let visibility = 'hidden'
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)
  const { result } = renderHook(() => useNow())
  const initial = result.current

  act(() => {
    vi.advanceTimersByTime(180_000)
  })
  expect(result.current).toBe(initial)

  act(() => {
    visibility = 'visible'
    document.dispatchEvent(new Event('visibilitychange'))
  })
  expect(result.current).toBe(Date.parse('2026-08-06T12:03:00+09:00'))
})
