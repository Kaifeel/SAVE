import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { useAuthStore } from './store/authStore.js'

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
  useItems: () => ({ items: [], setItems: vi.fn(), reload: vi.fn() }),
}))
vi.mock('./hooks/useChatRooms.js', () => ({
  useChatRooms: () => ({ activeRoom: null, setActiveRoom: vi.fn() }),
}))
vi.mock('./hooks/useRentals.js', () => ({ useRentals: () => ({}) }))
vi.mock('./hooks/useMyPageData.js', () => ({
  useMyPageData: () => ({ wishlist: { data: [] }, reload: vi.fn() }),
}))
vi.mock('./hooks/useRecommendations.js', () => ({
  useRecommendations: () => ({ current: null }),
}))
vi.mock('./api/chats.js', () => ({
  createOrGetChatRoom: vi.fn(),
  getChatRooms: vi.fn().mockResolvedValue([]),
}))
vi.mock('./api/notifications.js', () => ({
  getNotifications: vi.fn().mockResolvedValue([]),
  markAllNotificationsRead: vi.fn(),
  normalizeNotification: value => value,
}))

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  localStorage.clear()
  sessionStorage.clear()
  useAuthStore.getState().clearSession()
  useAuthStore.getState().setChecking()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

it('restores a completed Google profile after a browser refresh', async () => {
  const setSession = vi.spyOn(useAuthStore.getState(), 'setSession')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
    access_token: 'fresh-jwt',
    user: {
      id: 1,
      name: '구글사용자',
      department: '컴퓨터공학과',
      university_id: 1,
      university_name: '부경대학교',
    },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })))

  render(<App />)

  expect(await screen.findByRole('button', { name: '알림 열기' })).toBeInTheDocument()
  expect(screen.queryByText('회원 정보 입력')).not.toBeInTheDocument()
  expect(setSession).toHaveBeenCalledTimes(1)
  expect(useAuthStore.getState().accessToken).toBe('fresh-jwt')
  expect(localStorage).toHaveLength(0)
})

it('shows login only after refresh reports that there is no session', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
    JSON.stringify({ message: '다시 로그인해주세요.' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } },
  )))

  render(<App />)

  expect(await screen.findByRole('tab', { name: '로그인' })).toBeInTheDocument()
  expect(useAuthStore.getState().authStatus).toBe('unauthenticated')
})
