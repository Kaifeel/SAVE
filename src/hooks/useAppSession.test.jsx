import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  exchangeGoogleLogin,
  loginWithEmail,
  logoutSession,
  refreshSession,
  signUpWithEmail,
} from '../api/auth.js'
import { updateMyProfile } from '../api/users.js'
import { useAuthStore } from '../store/authStore.js'
import { useAppSession } from './useAppSession.js'

vi.mock('../api/auth.js', () => ({
  exchangeGoogleLogin: vi.fn(),
  loginWithEmail: vi.fn(),
  logoutSession: vi.fn(),
  refreshSession: vi.fn(),
  signUpWithEmail: vi.fn(),
}))
vi.mock('../api/users.js', () => ({ updateMyProfile: vi.fn() }))

const completedSession = {
  access_token: 'jwt',
  user: {
    id: 1,
    name: '사용자',
    department: '컴퓨터공학과',
    university_id: 1,
  },
}

function setup(overrides = {}) {
  const toast = { error: vi.fn(), success: vi.fn() }
  return {
    ...renderHook(() => useAppSession({
      apiEnabled: true,
      devAutoLogin: false,
      toast,
      ...overrides,
    })),
    toast,
  }
}

describe('useAppSession', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
    localStorage.clear()
    sessionStorage.clear()
    useAuthStore.getState().clearSession()
    useAuthStore.getState().setChecking()
    vi.clearAllMocks()
  })

  afterEach(() => vi.clearAllMocks())

  it('restores one refresh session without installing it twice', async () => {
    const setSession = vi.spyOn(useAuthStore.getState(), 'setSession')
    refreshSession.mockImplementation(async () => {
      useAuthStore.getState().setSession(completedSession)
      return completedSession
    })

    const { result } = setup()

    await waitFor(() => expect(result.current.isLoggedIn).toBe(true))
    expect(setSession).toHaveBeenCalledTimes(1)
    expect(result.current.member.name).toBe('사용자')
  })

  it('exchanges a Google callback, installs it, and removes the hash', async () => {
    window.history.replaceState(null, '', '/#google_login_code=once-code')
    exchangeGoogleLogin.mockResolvedValue(completedSession)

    const { result } = setup()

    await waitFor(() => expect(result.current.isLoggedIn).toBe(true))
    expect(exchangeGoogleLogin).toHaveBeenCalledWith('once-code')
    expect(useAuthStore.getState().accessToken).toBe('jwt')
    expect(window.location.hash).toBe('')
  })

  it('becomes logged out when refresh reports no session', async () => {
    refreshSession.mockRejectedValue(new Error('다시 로그인해주세요.'))

    const { result } = setup()

    await waitFor(() => expect(result.current.authStatus).toBe('unauthenticated'))
    expect(result.current.isLoggedIn).toBe(false)
    expect(useAuthStore.getState().accessToken).toBe(null)
  })

  it('derives completed profile fields from an existing session', () => {
    useAuthStore.getState().setSession(completedSession)

    const { result } = setup()

    expect(result.current.isProfileComplete).toBe(true)
    expect(result.current.member).toEqual({
      name: '사용자',
      department: '컴퓨터공학과',
      universityId: 1,
    })
  })

  it('updates and completes an incomplete profile', async () => {
    useAuthStore.getState().setSession({
      access_token: 'jwt',
      user: { id: 1 },
    })
    updateMyProfile.mockResolvedValue({
      id: 1,
      name: '새 이름',
      department: '디자인학과',
      university_id: 2,
    })
    const { result } = setup()
    act(() => {
      result.current.memberSetters.setName('새 이름')
      result.current.memberSetters.setDepartment('디자인학과')
      result.current.memberSetters.setUniversityId(2)
    })

    await act(() => result.current.completeProfile())

    expect(updateMyProfile).toHaveBeenCalledWith({
      name: '새 이름',
      department: '디자인학과',
      university_id: 2,
    }, 'jwt')
    expect(result.current.isProfileComplete).toBe(true)
    expect(useAuthStore.getState().user.name).toBe('새 이름')
  })

  it('clears local and persisted session even when server logout fails', async () => {
    useAuthStore.getState().setSession(completedSession)
    logoutSession.mockRejectedValue(new Error('network'))
    const { result } = setup()

    await expect(act(() => result.current.logout())).rejects.toThrow('network')

    expect(result.current.isLoggedIn).toBe(false)
    expect(result.current.isProfileComplete).toBe(false)
    expect(useAuthStore.getState().authStatus).toBe('unauthenticated')
  })

  it('uses the existing login and signup contracts', async () => {
    loginWithEmail.mockResolvedValue(completedSession)
    signUpWithEmail.mockResolvedValue(completedSession)
    const { result } = setup({ apiEnabled: false })

    await act(() => result.current.login({
      mode: 'login', email: 'a@example.com', password: 'pw',
    }))
    expect(loginWithEmail).toHaveBeenCalledWith('a@example.com', 'pw')

    await act(() => result.current.login({
      mode: 'signup',
      email: 'b@example.com',
      password: 'pw2',
      name: '가입자',
      department: '경영학과',
      universityId: 3,
    }))
    expect(signUpWithEmail).toHaveBeenCalledWith({
      email: 'b@example.com',
      password: 'pw2',
      name: '가입자',
      department: '경영학과',
      universityId: 3,
    })
  })
})
