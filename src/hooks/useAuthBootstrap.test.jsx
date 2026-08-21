import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '../store/authStore.js'
import { useAuthBootstrap } from './useAuthBootstrap.js'
import {
  exchangeGoogleLogin,
  refreshSession,
} from '../api/auth.js'

vi.mock('../api/auth.js', () => ({
  exchangeGoogleLogin: vi.fn(),
  loginWithEmail: vi.fn(),
  logoutSession: vi.fn(),
  refreshSession: vi.fn(),
  signUpWithEmail: vi.fn(),
}))

vi.mock('../api/users.js', () => ({
  updateMyProfile: vi.fn(),
}))

const completeSession = {
  access_token: 'fresh-token',
  user: {
    id: 7,
    name: '학생',
    department: '컴퓨터공학과',
    university_id: 1,
  },
}

beforeEach(() => {
  window.history.replaceState(null, '', '/rentals')
  useAuthStore.getState().clearSession()
  useAuthStore.getState().setChecking()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useAuthBootstrap', () => {
  it('개발 자동 로그인은 라우트 경계에 authenticated 상태를 제공한다', () => {
    const { result } = renderHook(() => useAuthBootstrap({
      enabled: false,
      autoLogin: true,
    }))

    expect(result.current.authStatus).toBe('authenticated')
    expect(result.current.isLoggedIn).toBe(true)
  })

  it('refresh가 끝나기 전에는 checking 상태를 유지하고 성공 세션을 적용한다', async () => {
    let resolveRefresh
    refreshSession.mockReturnValue(new Promise(resolve => { resolveRefresh = resolve }))

    const { result } = renderHook(() => useAuthBootstrap({ enabled: true }))

    expect(result.current.authStatus).toBe('checking')
    expect(window.location.pathname).toBe('/rentals')

    await act(async () => resolveRefresh(completeSession))

    await waitFor(() => expect(result.current.authStatus).toBe('authenticated'))
    expect(result.current.isProfileComplete).toBe(true)
    expect(useAuthStore.getState().accessToken).toBe('fresh-token')
    expect(window.location.pathname).toBe('/rentals')
  })

  it('refresh 실패가 확정된 뒤에만 세션을 unauthenticated로 지운다', async () => {
    let rejectRefresh
    refreshSession.mockReturnValue(new Promise((resolve, reject) => { rejectRefresh = reject }))

    const { result } = renderHook(() => useAuthBootstrap({ enabled: true }))

    expect(result.current.authStatus).toBe('checking')

    await act(async () => rejectRefresh(new Error('expired')))

    await waitFor(() => expect(result.current.authStatus).toBe('unauthenticated'))
  })

  it('Google 로그인 코드를 한 번 교환하고 URL hash를 제거한다', async () => {
    window.history.replaceState(null, '', '/items/12#google_login_code=one-time')
    exchangeGoogleLogin.mockResolvedValue(completeSession)

    const { result, rerender } = renderHook(() => useAuthBootstrap({ enabled: true }))

    await waitFor(() => expect(result.current.authStatus).toBe('authenticated'))
    rerender()

    expect(exchangeGoogleLogin).toHaveBeenCalledTimes(1)
    expect(exchangeGoogleLogin).toHaveBeenCalledWith('one-time')
    expect(window.location.pathname).toBe('/items/12')
    expect(window.location.hash).toBe('')
  })
})
