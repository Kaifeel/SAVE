import { StrictMode } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./components/toast.js', () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn() }),
}))

vi.mock('./hooks/useReferenceData.js', () => ({
  useReferenceData: () => ({
    universities: [],
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
  }),
}))

vi.mock('./hooks/useChatRooms.js', () => ({
  useChatRooms: () => ({
    activeRoom: null,
    setActiveRoom: vi.fn(),
    selectRoom: vi.fn(),
    send: vi.fn(),
  }),
}))

vi.mock('./hooks/useRentals.js', () => ({
  useRentals: () => ({}),
}))

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

const authResponse = {
  access_token: 'save-jwt',
  token_type: 'Bearer',
  is_new_user: true,
  user: {
    id: 1,
    email: 'student@pukyong.ac.kr',
    name: '학생',
    department: null,
    university_id: null,
  },
}

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState(null, '', '/#google_login_code=one-time-code')
  vi.restoreAllMocks()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderGoogleRedirect(response = authResponse) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(
    JSON.stringify(response),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  ))
  vi.stubGlobal('fetch', fetchMock)

  render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  return fetchMock
}

it('stores Google redirect authentication when rendered in StrictMode', async () => {
  const fetchMock = renderGoogleRedirect()

  await waitFor(() => {
    expect(JSON.parse(localStorage.getItem('save_auth'))).toEqual(authResponse)
  })
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

it('starts a new Google user with the test profile name', async () => {
  renderGoogleRedirect()

  expect(await screen.findByDisplayValue('테스트')).toBeInTheDocument()
})

it('uses the test name for a returning Google user with an incomplete profile', async () => {
  renderGoogleRedirect({
    ...authResponse,
    is_new_user: false,
  })

  expect(await screen.findByDisplayValue('테스트')).toBeInTheDocument()
})

it('restores an incomplete saved profile with the test name', () => {
  localStorage.setItem('save_auth', JSON.stringify({
    ...authResponse,
    is_new_user: false,
  }))
  window.history.replaceState(null, '', '/')

  render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

  expect(screen.getByDisplayValue('테스트')).toBeInTheDocument()
})
