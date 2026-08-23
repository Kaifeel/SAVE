import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getNotifications, markAllNotificationsRead } from '../api/notifications.js'
import { useAppNotifications } from './useAppNotifications.js'

vi.mock('../api/notifications.js', () => ({
  getNotifications: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  normalizeNotification: notification => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    text: notification.content ?? notification.text,
    read: Boolean(notification.read),
    time: notification.created_at ?? notification.time ?? '',
  }),
}))

function setup(overrides = {}) {
  const dependencies = {
    accessToken: 'jwt',
    enabled: true,
    initialNotifications: [],
    reloadItems: vi.fn().mockResolvedValue(undefined),
    reloadRentals: vi.fn().mockResolvedValue(undefined),
    reloadMyPage: vi.fn().mockResolvedValue(undefined),
    toast: { error: vi.fn() },
    ...overrides,
  }
  return {
    ...renderHook(() => useAppNotifications(dependencies)),
    dependencies,
  }
}

describe('useAppNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getNotifications.mockResolvedValue([])
    markAllNotificationsRead.mockResolvedValue(null)
  })

  it('loads persisted API notifications', async () => {
    getNotifications.mockResolvedValue([{
      id: 11,
      title: '새 대여 요청',
      text: '카메라 대여 요청이 도착했습니다.',
      read: false,
    }])

    const { result } = setup()

    await waitFor(() => expect(result.current.notifications).toHaveLength(1))
    expect(getNotifications).toHaveBeenCalledWith('jwt')
    expect(result.current.notifications[0].id).toBe(11)
  })

  it('deduplicates realtime notifications and reloads workflow data', async () => {
    const { result, dependencies } = setup()
    const incoming = {
      id: 20,
      type: 'REVIEW_PUBLISHED',
      title: '후기 공개',
      content: '서로의 후기가 공개되었습니다.',
    }

    act(() => {
      result.current.receive(incoming)
      result.current.receive(incoming)
    })

    expect(result.current.notifications.filter(entry => entry.id === 20)).toHaveLength(1)
    await waitFor(() => {
      expect(dependencies.reloadRentals).toHaveBeenCalledTimes(1)
      expect(dependencies.reloadMyPage).toHaveBeenCalledTimes(1)
      expect(dependencies.reloadItems).toHaveBeenCalledTimes(1)
    })
    expect(result.current.workflowRefreshVersion).toBe(1)
  })

  it('keeps a realtime notification that arrives before persisted loading finishes', async () => {
    let resolveNotifications
    getNotifications.mockReturnValue(new Promise(resolve => {
      resolveNotifications = resolve
    }))
    const { result } = setup()

    act(() => result.current.receive({
      id: 20,
      title: '실시간 요청',
      content: '우산 대여 요청입니다.',
    }))
    await act(() => {
      resolveNotifications([{ id: 11, title: '저장된 알림', read: false }])
    })

    expect(result.current.notifications.map(entry => entry.id)).toEqual([20, 11])
  })

  it('marks local notifications read after the API succeeds', async () => {
    const { result } = setup({
      initialNotifications: [{ id: 1, read: false }],
    })

    await act(() => result.current.markAllRead())

    expect(markAllNotificationsRead).toHaveBeenCalledWith('jwt')
    expect(result.current.notifications[0].read).toBe(true)
  })

  it('preserves unread state when mark-all-read fails', async () => {
    const error = new Error('실패')
    markAllNotificationsRead.mockRejectedValue(error)
    const { result, dependencies } = setup({
      initialNotifications: [{ id: 1, read: false }],
    })

    await act(() => result.current.markAllRead())

    expect(result.current.notifications[0].read).toBe(false)
    expect(dependencies.toast.error).toHaveBeenCalledWith('실패')
  })

  it('clears notifications and closes the panel', () => {
    const { result } = setup({
      enabled: false,
      initialNotifications: [{ id: 1, read: false }],
    })
    act(() => result.current.setIsOpen(true))

    act(() => result.current.clear())

    expect(result.current.notifications).toEqual([])
    expect(result.current.isOpen).toBe(false)
  })
})
