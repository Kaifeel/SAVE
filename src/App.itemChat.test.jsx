import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { createOrGetChatRoom } from './api/chats.js'
import { useAuthStore } from './store/authStore.js'

const { selectRoom } = vi.hoisted(() => ({ selectRoom: vi.fn() }))

vi.mock('./config/runtime.js', () => ({
  USE_API: true,
  isAutoLoginEnabled: () => false,
}))
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
    reload: vi.fn(),
    remove: vi.fn(),
    loading: false,
    error: null,
  }),
}))
vi.mock('./hooks/useChatRooms.js', () => ({
  useChatRooms: () => ({
    activeRoom: null,
    setActiveRoom: vi.fn(),
    selectRoom,
  }),
}))
vi.mock('./hooks/useRentals.js', () => ({ useRentals: () => ({}) }))
vi.mock('./hooks/useMyPageData.js', () => ({
  useMyPageData: () => ({ wishlist: { data: [] }, reload: vi.fn() }),
}))
vi.mock('./hooks/useRecommendations.js', () => ({
  useRecommendations: () => ({ current: null }),
}))
vi.mock('./api/chats.js', () => ({
  createOrGetChatRoom: vi.fn().mockResolvedValue({
    room_id: 31,
    item_id: 7,
    item_title: '테스트 우산',
    other_user_name: '판매자',
    unread_count: 0,
  }),
  getChatRooms: vi.fn().mockResolvedValue([]),
}))
vi.mock('./api/notifications.js', () => ({
  getNotifications: vi.fn().mockResolvedValue([]),
  markAllNotificationsRead: vi.fn(),
  normalizeNotification: value => value,
}))
vi.mock('./pages/HomePage.jsx', () => ({
  default: ({ setSelectedItem }) => (
    <button
      type="button"
      onClick={() => setSelectedItem({
        id: 7,
        title: '테스트 우산',
        owner: '판매자 컴퓨터공학과',
        ownerId: 2,
      })}
    >
      테스트 우산 열기
    </button>
  ),
}))
vi.mock('./ProductDetailPage.jsx', () => ({
  default: ({ onChat }) => (
    <button type="button" onClick={onChat}>채팅 문의</button>
  ),
}))
vi.mock('./pages/ChatPage.jsx', () => ({
  default: () => <section>채팅</section>,
}))

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  useAuthStore.getState().setSession({
    access_token: 'jwt',
    user: {
      id: 1,
      name: '구매자',
      department: '컴퓨터공학과',
      university_id: 1,
    },
  })
})

afterEach(() => {
  cleanup()
  useAuthStore.getState().clearSession()
  vi.clearAllMocks()
})

it('creates and selects one room before navigating from an item to chat', async () => {
  render(<App />)

  fireEvent.click(screen.getByRole('button', { name: '테스트 우산 열기' }))
  fireEvent.click(screen.getByRole('button', { name: '채팅 문의' }))

  await waitFor(() => {
    expect(screen.getByText('채팅')).toBeInTheDocument()
  })
  expect(createOrGetChatRoom).toHaveBeenCalledTimes(1)
  expect(createOrGetChatRoom).toHaveBeenCalledWith(7, 'jwt')
  expect(selectRoom).toHaveBeenCalledTimes(1)
})
