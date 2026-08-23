import { useCallback, useEffect, useRef, useState } from 'react'
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

function hasCompletedProfile(user, fallbackUniversityId = null) {
  return Boolean(
    user?.name
      && user?.department
      && (universityIdOf(user) ?? fallbackUniversityId),
  )
}

export function useAppSession({ apiEnabled, devAutoLogin, toast }) {
  const accessToken = useAuthStore(state => state.accessToken)
  const user = useAuthStore(state => state.user)
  const authStatus = useAuthStore(state => state.authStatus)
  const setSession = useAuthStore(state => state.setSession)
  const updateAuthUser = useAuthStore(state => state.updateUser)
  const clearSession = useAuthStore(state => state.clearSession)
  const savedUniversityId = universityIdOf(user)
  const savedProfileComplete = hasCompletedProfile(user)
  const [isLoggedIn, setIsLoggedIn] = useState(
    devAutoLogin || authStatus === 'authenticated',
  )
  const [isProfileComplete, setIsProfileComplete] = useState(
    devAutoLogin || savedProfileComplete,
  )
  const [memberName, setMemberName] = useState(
    savedProfileComplete ? user.name : (devAutoLogin ? '홍길동' : ''),
  )
  const [memberDepartment, setMemberDepartment] = useState(
    user?.department || (devAutoLogin ? '컴퓨터공학과' : ''),
  )
  const [memberUniversityId, setMemberUniversityId] = useState(
    savedUniversityId ?? (devAutoLogin ? 1 : null),
  )
  const bootstrapStarted = useRef(false)

  const clear = useCallback(() => {
    clearSession()
    setIsLoggedIn(false)
    setIsProfileComplete(false)
  }, [clearSession])

  const applyAuth = useCallback((
    nextAuth,
    fallbackUniversityId = null,
    { installSession = true } = {},
  ) => {
    const nextUser = nextAuth?.user ?? null
    const profileUniversityId = universityIdOf(nextUser) ?? fallbackUniversityId

    if (installSession) setSession(nextAuth)
    setMemberName(nextUser?.name || '')
    setMemberDepartment(nextUser?.department || '')
    setMemberUniversityId(profileUniversityId)
    setIsProfileComplete(hasCompletedProfile(nextUser, fallbackUniversityId))
    setIsLoggedIn(true)
  }, [setSession])

  useEffect(() => {
    if (!apiEnabled || devAutoLogin || authStatus !== 'checking'
      || bootstrapStarted.current) return undefined
    bootstrapStarted.current = true

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
      .then(nextAuth => applyAuth(nextAuth, null, { installSession: Boolean(code) }))
      .catch(error => {
        clear()
        if (code) toast.error(error.message || 'Google 로그인에 실패했습니다.')
      })
    return undefined
  }, [apiEnabled, applyAuth, authStatus, clear, devAutoLogin, toast])

  const login = useCallback(async ({
    mode,
    email,
    password,
    name,
    department,
    universityId,
  }) => {
    const nextAuth = mode === 'signup'
      ? await signUpWithEmail({ email, password, name, department, universityId })
      : await loginWithEmail(email, password)
    applyAuth(nextAuth, universityId)
  }, [applyAuth])

  const completeProfile = useCallback(async () => {
    if (apiEnabled && accessToken) {
      try {
        const updatedUser = await updateMyProfile({
          name: memberName,
          department: memberDepartment,
          university_id: memberUniversityId,
        }, accessToken)
        updateAuthUser(updatedUser)
      } catch (error) {
        toast.error(error.message || '회원 정보를 저장하지 못했습니다.')
        return
      }
    }

    setIsProfileComplete(true)
  }, [
    accessToken,
    apiEnabled,
    memberDepartment,
    memberName,
    memberUniversityId,
    toast,
    updateAuthUser,
  ])

  const logout = useCallback(async () => {
    try {
      if (apiEnabled) await logoutSession()
    } finally {
      clear()
    }
  }, [apiEnabled, clear])

  return {
    accessToken,
    user,
    authStatus,
    isLoggedIn,
    isProfileComplete,
    member: {
      name: memberName,
      department: memberDepartment,
      universityId: memberUniversityId,
    },
    memberSetters: {
      setName: setMemberName,
      setDepartment: setMemberDepartment,
      setUniversityId: setMemberUniversityId,
    },
    login,
    completeProfile,
    clear,
    logout,
  }
}
