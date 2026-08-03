import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from './App'
import { getNotifications, markAllNotificationsRead } from './api/notifications.js'

const testState = vi.hoisted(() => ({ chatOptions: null }))

vi.mock('./components/toast.js', () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn() }),
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

vi.mock('./hooks/useRentals.js', () => ({ useRentals: () => ({}) }))
vi.mock('./hooks/useMyPageData.js', () => ({
  useMyPageData: () => ({ wishlist: { data: [] } }),
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
    title: notification.title,
    text: notification.content ?? notification.text,
    read: Boolean(notification.read),
    time: notification.created_at ?? notification.time ?? '',
  }),
  markAllNotificationsRead: vi.fn(),
}))

beforeEach(() => {
  testState.chatOptions = null
  localStorage.setItem('save_auth', JSON.stringify({
    access_token: 'jwt',
    user: {
      id: 1,
      name: '사용자',
      department: '컴퓨터공학과',
      university_id: 1,
      university_name: '부경대학교',
    },
  }))
  getNotifications.mockResolvedValue([{
    id: 11,
    title: '새 대여 요청',
    text: '카메라 대여 요청이 도착했습니다.',
    time: '8월 3일 오후 9:00',
    read: false,
  }])
  markAllNotificationsRead.mockResolvedValue(null)
})

afterEach(() => {
  cleanup()
  localStorage.clear()
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
