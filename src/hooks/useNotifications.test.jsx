import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications.js'
import { useNotifications } from './useNotifications.js'

vi.mock('../api/notifications.js', () => ({
  getNotifications: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
  normalizeNotification: value => ({ ...value, text: value.text ?? value.message }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  getNotifications.mockResolvedValue([])
})

describe('useNotifications', () => {
  it('느린 목록 요청 중 도착한 실시간 알림을 버리지 않는다', async () => {
    let resolveSnapshot
    getNotifications.mockReturnValue(new Promise(resolve => { resolveSnapshot = resolve }))
    const { result } = renderHook(() => useNotifications({
      accessToken: 'token',
      enabled: true,
    }))

    act(() => result.current.handleRealtime({
      id: 2,
      title: '실시간',
      createdAt: '2026-08-21T10:01:00Z',
      read: false,
    }))
    await act(async () => resolveSnapshot([{
      id: 1,
      title: '저장됨',
      createdAt: '2026-08-21T10:00:00Z',
      read: false,
    }]))

    expect(result.current.notifications.map(entry => entry.id)).toEqual([2, 1])
  })

  it('서버 snapshot의 중복 알림 읽음 상태를 우선한다', async () => {
    getNotifications.mockResolvedValue([{
      id: 1,
      title: '서버 상태',
      createdAt: '2026-08-21T10:00:00Z',
      read: true,
    }])
    const { result } = renderHook(() => useNotifications({
      accessToken: 'token',
      enabled: false,
      initialNotifications: [{
        id: 1,
        title: '이전 상태',
        createdAt: '2026-08-21T10:00:00Z',
        read: false,
      }],
    }))

    await act(async () => result.current.reload())

    expect(result.current.notifications).toHaveLength(1)
    expect(result.current.notifications[0]).toMatchObject({ title: '서버 상태', read: true })
  })

  it('개별 및 전체 읽음 API 성공 후 로컬 상태를 갱신한다', async () => {
    const { result } = renderHook(() => useNotifications({
      accessToken: 'token',
      enabled: true,
      initialNotifications: [
        { id: 2, read: false },
        { id: 1, read: false },
      ],
    }))

    await act(async () => result.current.markRead(2))
    expect(markNotificationRead).toHaveBeenCalledWith(2, 'token')
    expect(result.current.notifications.find(entry => entry.id === 2).read).toBe(true)

    await act(async () => result.current.markAllRead())
    expect(markAllNotificationsRead).toHaveBeenCalledWith('token')
    expect(result.current.unreadCount).toBe(0)
  })

  it('reload를 호출하면 서버 목록을 다시 합친다', async () => {
    const { result } = renderHook(() => useNotifications({
      accessToken: 'token',
      enabled: false,
    }))
    getNotifications.mockResolvedValue([{ id: 8, read: false }])

    await act(async () => result.current.reload())

    await waitFor(() => expect(result.current.notifications).toHaveLength(1))
    expect(getNotifications).toHaveBeenCalledWith('token')
  })
})
