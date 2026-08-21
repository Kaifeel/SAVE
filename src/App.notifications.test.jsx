import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from './App'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './api/notifications.js'
import { useAuthStore } from './store/authStore.js'

const testState = vi.hoisted(() => ({
  chatOptions: null,
  toast: { error: vi.fn(), success: vi.fn() },
  reloadItems: vi.fn(),
  reloadRentals: vi.fn(),
  reloadMyPage: vi.fn(),
}))

vi.mock('./components/toast.js', () => ({
  useToast: () => testState.toast,
}))

vi.mock('./hooks/useReferenceData.js', () => ({
  useReferenceData: () => ({
    universities: [{ id: 1, name: '부경대학교' }],
    pickupLocations: [],
    error: null,
  }),
}))

vi.mock('./hooks/useItems.js', () => ({
  useItems: () => ({
    items: [],
    setItems: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    updateStatus: vi.fn(),
    reload: testState.reloadItems,
    loading: false,
    error: null,
  }),
}))

vi.mock('./hooks/useChatRooms.js', () => ({
  useChatRooms: options => {
    testState.chatOptions = options
    return {
      activeRoom: null,
      setActiveRoom: vi.fn(),
      selectRoom: vi.fn(),
      send: vi.fn(),
    }
  },
}))

vi.mock('./hooks/useRentals.js', () => ({
  useRentals: () => ({ reload: testState.reloadRentals }),
}))
vi.mock('./hooks/useMyPageData.js', () => ({
  useMyPageData: () => ({ wishlist: { data: [] }, reload: testState.reloadMyPage }),
}))
vi.mock('./hooks/useRecommendations.js', () => ({
  useRecommendations: () => ({ current: null }),
}))
vi.mock('./api/chats.js', () => ({
  createOrGetChatRoom: vi.fn(),
  getChatRooms: vi.fn().mockResolvedValue([]),
}))
vi.mock('./api/notifications.js', () => ({
  getNotifications: vi.fn(),
  normalizeNotification: notification => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    text: notification.content ?? notification.text,
    read: Boolean(notification.read),
    createdAt: notification.created_at ?? notification.createdAt,
    time: notification.created_at ?? notification.time ?? '',
  }),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}))

beforeEach(() => {
  testState.chatOptions = null
  testState.reloadItems.mockResolvedValue(undefined)
  testState.reloadRentals.mockResolvedValue(undefined)
  testState.reloadMyPage.mockResolvedValue(undefined)
  useAuthStore.getState().setSession({
    access_token: 'jwt',
    user: {
      id: 1,
      name: '사용자',
      department: '컴퓨터공학과',
      university_id: 1,
      university_name: '부경대학교',
    },
  })
  getNotifications.mockResolvedValue([{
    id: 11,
    title: '새 대여 요청',
    text: '카메라 대여 요청이 도착했습니다.',
    time: '8월 3일 오후 9:00',
    read: false,
  }])
  markAllNotificationsRead.mockResolvedValue(null)
  markNotificationRead.mockResolvedValue(null)
})

afterEach(() => {
  cleanup()
  useAuthStore.getState().clearSession()
  vi.clearAllMocks()
})

it('loads persisted notifications and marks all as read', async () => {
  render(<App />)

  const bell = await screen.findByRole('button', { name: '알림 열기' })
  expect(screen.getByLabelText('읽지 않은 알림 있음')).toBeInTheDocument()
  fireEvent.click(bell)

  expect(await screen.findByRole('dialog', { name: '알림 목록' })).toBeInTheDocument()
  expect(screen.getByText('새 대여 요청')).toBeInTheDocument()
  expect(screen.getByText('카메라 대여 요청이 도착했습니다.')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: '모두 읽음' }))
  await waitFor(() => expect(markAllNotificationsRead).toHaveBeenCalledWith('jwt'))
  await waitFor(() => {
    expect(screen.queryByLabelText('읽지 않은 알림 있음')).not.toBeInTheDocument()
  })
})

it('merges a realtime notification only once', async () => {
  getNotifications.mockResolvedValue([])
  render(<App />)
  await waitFor(() => expect(testState.chatOptions?.onNotification).toBeTypeOf('function'))

  const incoming = {
    id: 20,
    title: '실시간 요청',
    content: '우산 대여 요청입니다.',
    read: false,
    created_at: '방금 전',
  }
  act(() => {
    testState.chatOptions.onNotification(incoming)
    testState.chatOptions.onNotification(incoming)
  })

  fireEvent.click(screen.getByRole('button', { name: '알림 열기' }))
  expect(screen.getAllByText('실시간 요청')).toHaveLength(1)
})

it('keeps a realtime notification when an older list response arrives later', async () => {
  let resolveNotifications
  getNotifications.mockReturnValue(new Promise(resolve => {
    resolveNotifications = resolve
  }))
  render(<App />)
  await waitFor(() => expect(testState.chatOptions?.onNotification).toBeTypeOf('function'))

  act(() => {
    testState.chatOptions.onNotification({
      id: 21,
      type: 'RENTAL_REQUESTED',
      title: '방금 도착한 요청',
      content: '실시간으로 받은 알림입니다.',
      read: false,
      created_at: '2026-08-21T15:00:00',
    })
  })
  await act(async () => {
    resolveNotifications([])
  })

  fireEvent.click(screen.getByRole('button', { name: '알림 열기' }))
  expect(screen.getByText('방금 도착한 요청')).toBeInTheDocument()
})

it('marks one notification as read when it is selected', async () => {
  render(<App />)
  fireEvent.click(await screen.findByRole('button', { name: '알림 열기' }))

  fireEvent.click(await screen.findByRole('button', { name: /새 대여 요청/ }))

  await waitFor(() => expect(markNotificationRead).toHaveBeenCalledWith(11, 'jwt'))
  await waitFor(() => {
    expect(screen.queryByLabelText('읽지 않은 알림 있음')).not.toBeInTheDocument()
  })
})

it('reloads persisted notifications after websocket reconnection', async () => {
  getNotifications
    .mockResolvedValueOnce([{
      id: 11,
      title: '새 대여 요청',
      text: '카메라 대여 요청이 도착했습니다.',
      time: '8월 3일 오후 9:00',
      read: false,
    }])
    .mockResolvedValueOnce([{
      id: 11,
      title: '새 대여 요청',
      text: '카메라 대여 요청이 도착했습니다.',
      time: '8월 3일 오후 9:00',
      read: true,
    }])
  render(<App />)
  await waitFor(() => expect(getNotifications).toHaveBeenCalledTimes(1))
  expect(screen.getByLabelText('읽지 않은 알림 있음')).toBeInTheDocument()
  expect(testState.chatOptions?.onReconnect).toBeTypeOf('function')

  await act(() => testState.chatOptions.onReconnect())

  await waitFor(() => expect(getNotifications).toHaveBeenCalledTimes(2))
  await waitFor(() => {
    expect(screen.queryByLabelText('읽지 않은 알림 있음')).not.toBeInTheDocument()
  })
})

it('reloads review-related screens when mutual reviews are published', async () => {
  getNotifications.mockResolvedValue([])
  render(<App />)
  await waitFor(() => expect(testState.chatOptions?.onNotification).toBeTypeOf('function'))

  act(() => {
    testState.chatOptions.onNotification({
      id: 30,
      type: 'REVIEW_PUBLISHED',
      title: '후기 공개',
      content: '서로의 후기가 공개되었습니다.',
    })
  })

  await waitFor(() => {
    expect(testState.reloadRentals).toHaveBeenCalledTimes(1)
    expect(testState.reloadMyPage).toHaveBeenCalledTimes(1)
    expect(testState.reloadItems).toHaveBeenCalledTimes(1)
  })
})
