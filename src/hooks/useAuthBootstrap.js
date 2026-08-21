import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  exchangeGoogleLogin,
  loginWithEmail,
  logoutSession,
  refreshSession,
  signUpWithEmail,
} from '../api/auth.js'
import { updateMyProfile } from '../api/users.js'
import { useAuthStore } from '../store/authStore.js'

function universityIdOf(user) {
  return user?.university_id ?? user?.universityId ?? null
}

function profileComplete(user, fallbackUniversityId = null) {
  return Boolean(
    user?.name
      && user?.department
      && (universityIdOf(user) ?? fallbackUniversityId),
  )
}

export function useAuthBootstrap({
  enabled,
  autoLogin = false,
  onAuthenticated,
  onLogout,
  onGoogleError,
} = {}) {
  const accessToken = useAuthStore(state => state.accessToken)
  const user = useAuthStore(state => state.user)
  const authStatus = useAuthStore(state => state.authStatus)
  const setSession = useAuthStore(state => state.setSession)
  const updateAuthUser = useAuthStore(state => state.updateUser)
  const clearSession = useAuthStore(state => state.clearSession)
  const started = useRef(false)

  const savedUniversityId = universityIdOf(user)
  const savedProfileComplete = profileComplete(user)
  const [memberName, setMemberName] = useState(
    savedProfileComplete ? user.name : (accessToken ? '테스트' : (autoLogin ? '홍길동' : '')),
  )
  const [memberDepartment, setMemberDepartment] = useState(
    user?.department || (autoLogin ? '컴퓨터공학과' : ''),
  )
  const [memberUniversityId, setMemberUniversityId] = useState(
    savedUniversityId ?? (autoLogin ? 1 : null),
  )
  const [isProfileComplete, setIsProfileComplete] = useState(
    autoLogin || savedProfileComplete,
  )

  const isLoggedIn = autoLogin || authStatus === 'authenticated'
  const resolvedAuthStatus = autoLogin ? 'authenticated' : authStatus

  const applyAuth = useCallback((session, fallbackUniversityId = null) => {
    const nextUser = session?.user ?? null
    const nextUniversityId = universityIdOf(nextUser) ?? fallbackUniversityId
    const completed = profileComplete(nextUser, fallbackUniversityId)

    onAuthenticated?.()
    setSession(session)
    setMemberName(completed ? nextUser.name : '테스트')
    setMemberDepartment(nextUser?.department || '')
    setMemberUniversityId(nextUniversityId)
    setIsProfileComplete(completed)
  }, [onAuthenticated, setSession])

  useEffect(() => {
    if (!enabled || autoLogin || authStatus !== 'checking' || started.current) return
    started.current = true

    const params = window.location.hash.startsWith('#')
      ? new URLSearchParams(window.location.hash.slice(1))
      : null
    const code = params?.get('google_login_code')
    if (code) {
      window.history.replaceState(
        null,
        document.title,
        `${window.location.pathname}${window.location.search}`,
      )
    }

    const restore = code ? exchangeGoogleLogin(code) : refreshSession()
    restore
      .then(applyAuth)
      .catch(error => {
        clearSession()
        if (code) onGoogleError?.(error)
      })
  }, [applyAuth, authStatus, autoLogin, clearSession, enabled, onGoogleError])

  const login = useCallback(async ({
    mode,
    email,
    password,
    name,
    department,
    universityId,
  }) => {
    const session = mode === 'signup'
      ? await signUpWithEmail({ email, password, name, department, universityId })
      : await loginWithEmail(email, password)
    applyAuth(session, universityId)
  }, [applyAuth])

  const completeProfile = useCallback(async () => {
    if (enabled && accessToken) {
      const updatedUser = await updateMyProfile({
        name: memberName,
        department: memberDepartment,
        university_id: memberUniversityId,
      }, accessToken)
      updateAuthUser(updatedUser)
    }
    setIsProfileComplete(true)
  }, [accessToken, enabled, memberDepartment, memberName, memberUniversityId, updateAuthUser])

  const logout = useCallback(async () => {
    try {
      if (enabled) await logoutSession()
    } finally {
      clearSession()
      setIsProfileComplete(false)
      onLogout?.()
    }
  }, [clearSession, enabled, onLogout])

  return useMemo(() => ({
    accessToken,
    user,
    authStatus: resolvedAuthStatus,
    isLoggedIn,
    isProfileComplete,
    memberName,
    setMemberName,
    memberDepartment,
    setMemberDepartment,
    memberUniversityId,
    setMemberUniversityId,
    applyAuth,
    login,
    completeProfile,
    logout,
  }), [
    accessToken,
    applyAuth,
    completeProfile,
    isLoggedIn,
    isProfileComplete,
    login,
    logout,
    memberDepartment,
    memberName,
    memberUniversityId,
    resolvedAuthStatus,
    user,
  ])
}
