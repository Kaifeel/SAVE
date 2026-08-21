import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router'
import AppRouter from './AppRouter.jsx'
import { useAuthStore } from '../store/authStore.js'
import { useAuthBootstrap } from '../hooks/useAuthBootstrap.js'

vi.mock('../components/toast.js', () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn() }),
}))

vi.mock('../hooks/useReferenceData.js', () => ({
  useReferenceData: () => ({
    universities: [{ id: 1, name: '부경대학교' }],
    pickupLocations: [],
    error: null,
  }),
}))

vi.mock('../hooks/useItems.js', () => ({
  useItems: () => ({
    items: [{
      id: 1,
      title: '테스트 우산',
      price: 1000,
      priceType: '일',
      location: '누리관',
      universityId: 1,
      university: '부경대학교',
      type: 'rent',
      section: 'recent',
      status: 'available',
      badge: '신규',
      owner: '대여자',
      ownerId: 9,
      rating: 5,
      reviews: 0,
      description: '설명',
      iconColor: 'text-blue-500',
      imageIcon: () => null,
    }],
    setItems: vi.fn(),
    reload: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  }),
}))

vi.mock('../hooks/useChatRooms.js', async () => {
  const { useState } = await import('react')
  return {
    useChatRooms: () => {
      const [activeRoom, setActiveRoom] = useState(null)
      return {
        activeRoom,
        setActiveRoom,
        selectRoom: async room => setActiveRoom(room),
        send: vi.fn(),
      }
    },
  }
})

vi.mock('../hooks/useRentals.js', () => ({
  useRentals: () => ({
    rentals: [],
    received: [],
    sent: [],
    loading: false,
    error: null,
    reload: vi.fn(),
    transition: vi.fn(),
    submitReview: vi.fn(),
    create: vi.fn(),
  }),
}))

vi.mock('../hooks/useMyPageData.js', () => ({
  useMyPageData: () => ({ wishlist: { data: [] }, reload: vi.fn() }),
}))

vi.mock('../hooks/useRecommendations.js', () => ({
  useRecommendations: () => ({ current: null, refresh: vi.fn() }),
}))

vi.mock('../api/chats.js', () => ({
  createOrGetChatRoom: vi.fn(),
  getChatRooms: vi.fn().mockResolvedValue([{
    id: 3,
    opponent_name: '채팅 상대',
    item_title: '테스트 우산',
    messages: [],
  }]),
}))

vi.mock('../api/notifications.js', () => ({
  getNotifications: vi.fn().mockResolvedValue([]),
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
  normalizeNotification: value => value,
}))

vi.mock('../api/auth.js', () => ({
  exchangeGoogleLogin: vi.fn(),
  loginWithEmail: vi.fn(),
  logoutSession: vi.fn(),
  refreshSession: vi.fn(() => new Promise(() => {})),
  signUpWithEmail: vi.fn(),
}))

function CurrentPath() {
  return <output aria-label="current path">{useLocation().pathname}</output>
}

function TestRouter() {
  const auth = useAuthBootstrap({ enabled: false })
  return <AppRouter auth={auth} />
}

function renderRoute(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TestRouter />
      <CurrentPath />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  useAuthStore.getState().setSession({
    access_token: 'token',
    user: {
      id: 7,
      name: '학생',
      department: '컴퓨터공학과',
      university_id: 1,
    },
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AppRouter', () => {
  it('세션 확인 중에는 보호 경로를 로그인으로 바꾸지 않는다', () => {
    useAuthStore.getState().setChecking()
    renderRoute('/rentals')

    expect(screen.getByText('로그인 상태 확인 중...')).toBeInTheDocument()
    expect(screen.getByLabelText('current path')).toHaveTextContent('/rentals')
  })

  it('인증 실패가 확정되면 요청 경로를 보존해 /login으로 이동한다', async () => {
    useAuthStore.getState().clearSession()
    renderRoute('/rentals')

    await waitFor(() => {
      expect(screen.getByLabelText('current path')).toHaveTextContent('/login')
    })
    expect(screen.getByRole('tab', { name: '로그인' })).toBeInTheDocument()
  })

  it('미완성 프로필은 요청 경로를 보존해 /profile/setup으로 이동한다', async () => {
    useAuthStore.getState().setSession({
      access_token: 'token',
      user: { id: 7, name: '학생', department: null, university_id: 1 },
    })
    renderRoute('/rentals')

    await waitFor(() => {
      expect(screen.getByLabelText('current path')).toHaveTextContent('/profile/setup')
    })
    expect(screen.getByRole('heading', { name: '회원 정보 입력' })).toBeInTheDocument()
  })

  it('/rentals 직접 접근 시 대여 내역을 유지한다', () => {
    renderRoute('/rentals')

    expect(screen.getByRole('heading', { name: '대여 내역' })).toBeInTheDocument()
    expect(screen.getByLabelText('current path')).toHaveTextContent('/rentals')
  })

  it('/items/:itemId 직접 접근 시 요청한 물품 상세를 연다', async () => {
    renderRoute('/items/1')

    expect(await screen.findByRole('heading', { level: 1, name: '테스트 우산' }))
      .toBeInTheDocument()
    expect(screen.getByLabelText('current path')).toHaveTextContent('/items/1')
  })

  it('존재하지 않는 물품 URL은 명시적인 찾을 수 없음 상태를 보여준다', () => {
    renderRoute('/items/999')

    expect(screen.getByRole('alert')).toHaveTextContent('물품을 찾을 수 없습니다.')
    expect(screen.getByLabelText('current path')).toHaveTextContent('/items/999')
  })

  it('하단 탐색 링크가 화면과 URL을 함께 변경한다', async () => {
    renderRoute('/')

    await userEvent.click(screen.getByRole('link', { name: '탐색' }))

    expect(screen.getByRole('heading', { name: '물품 탐색' })).toBeInTheDocument()
    expect(screen.getByLabelText('current path')).toHaveTextContent('/search')
  })

  it('/chats/:roomId 직접 접근과 채팅 목록 뒤로가기를 URL에 반영한다', async () => {
    renderRoute('/chats/3')

    expect(await screen.findByText('채팅 상대')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '채팅 목록으로' }))

    expect(screen.getByRole('heading', { name: '채팅 목록' })).toBeInTheDocument()
    expect(screen.getByLabelText('current path')).toHaveTextContent('/chats')
  })

  it('접근할 수 없는 채팅방 URL은 명시적인 오류를 보여준다', async () => {
    renderRoute('/chats/999')

    expect(await screen.findByRole('alert')).toHaveTextContent('채팅방을 찾을 수 없습니다.')
  })

  it('알 수 없는 인증 경로는 홈으로 교체한다', async () => {
    renderRoute('/does-not-exist')

    await waitFor(() => {
      expect(screen.getByLabelText('current path')).toHaveTextContent('/')
    })
  })
})
