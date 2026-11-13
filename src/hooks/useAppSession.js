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

// 아래 두 함수는 커스텀 훅이 아니라 세션 훅에서 사용하는 일반 헬퍼 함수입니다.
// universityIdOf는 user 객체에서 대학 ID를 가져온다는 뜻으로, API의 snake_case와 앱의 camelCase를 모두 처리합니다.
// hasCompletedProfile은 프로필이 완성됐는지 확인한다는 뜻으로, 이름·학과·대학 ID를 기준으로 판별합니다.
// 둘 다 React 훅을 호출하지 않으므로 훅 이름 규칙인 use 접두사를 붙이지 않습니다. 따라서 ESLint 훅 규칙에도 맞습니다.
function universityIdOf(user) {
  // 함수명은 universityId(대학 ID) + of(user)(user에서 가져옴)이라는 뜻입니다.
  // 조회 순서: user.university_id → user.universityId → null
  // API 응답은 snake_case, 앱 내부 객체는 camelCase를 사용할 수 있어 두 형식을 모두 확인합니다.
  // 왼쪽 값이 null/undefined일 때만 화살표 방향으로 다음 값을 확인합니다.
  // 두 형식을 모두 확인하는 것은 응답 형식 차이를 지원하기 위한 의미 있는 호환 처리이며, 첫 값이 있으면 다음 값은 평가하지 않아 비용도 사실상 무시할 수준입니다.
  return user?.university_id ?? user?.universityId ?? null
}

function hasCompletedProfile(user, fallbackUniversityId = null) {
  // 이름, 학과, 대학 ID가 모두 존재해야 프로필 설정이 완료된 것으로 봅니다.
  // 대학 ID는 user의 값이 우선이며, 없을 때 fallbackUniversityId를 사용합니다.
  return Boolean(
    user?.name
      && user?.department
      && (universityIdOf(user) ?? fallbackUniversityId),
  )
}

// 커스텀 훅 없이 컴포넌트 안에서 useState, useEffect 같은 기본 훅만으로도 구현할 수 있습니다.
// 다만 이 파일처럼 인증·세션 로직이 많을 때는 관련 처리를 한곳에 묶어 컴포넌트를 간결하게 유지하고 재사용하기 위해 커스텀 훅을 사용하는 편이 편리합니다.
// 커스텀 훅 이름은 직접 정하며 보통 use로 시작합니다. ESLint는 코드 스타일을 일관되게 유지하고 잠재적인 오류를 미리 찾아 코드 품질을 높이기 위해 사용합니다. 린터는 모든 함수의 실행 흐름을 실제로 추적해 훅 사용 여부를 판별하기 어렵기 때문에, 이 이름 규칙으로 훅을 사용하는 함수임을 알아내고 훅 규칙 위반을 검사합니다.
export function useAppSession({ apiEnabled, devAutoLogin, toast }) {
  // 전역 인증 저장소에서 토큰, 사용자, 인증 상태와 세션 변경 함수를 구독합니다.
  const accessToken = useAuthStore(state => state.accessToken)
  const user = useAuthStore(state => state.user)
  const authStatus = useAuthStore(state => state.authStatus)
  const setSession = useAuthStore(state => state.setSession)
  const updateAuthUser = useAuthStore(state => state.updateUser)
  const clearSession = useAuthStore(state => state.clearSession)
  // 저장된 사용자 정보를 로컬 프로필 상태의 초기값으로 정리합니다.
  const savedUniversityId = universityIdOf(user)
  const savedProfileComplete = hasCompletedProfile(user)
  // 컴포넌트에서 사용할 로그인/프로필 상태입니다. 개발 자동 로그인 모드에서는 예시 정보를 제공합니다.
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
  // effect가 다시 실행되더라도 앱 시작 시 세션 복구를 중복 요청하지 않게 합니다.
  const bootstrapStarted = useRef(false)

  // 전역 세션과 이 훅이 관리하는 로그인/프로필 상태를 함께 초기화합니다.
  // 이 파일은 .js 확장자의 JavaScript 파일입니다. JSX를 작성하지 않는 한 일반 JavaScript 문법과 // 주석을 사용합니다.
  // 위에서 const [isLoggedIn, setIsLoggedIn] = useState(...)처럼 배열 구조 분해로 현재 값과 변경 함수를 받았습니다.
  // setIsLoggedIn(value)는 상태 변경 함수 호출 예입니다. set 접두사는 역할을 알아보기 쉽게 붙이는 이름 관례이며 필수 문법은 아닙니다.
  // React 훅은 컴포넌트 또는 커스텀 훅의 최상위에서 매 렌더링마다 같은 순서로 호출해야 합니다. 조건문이나 반복문 안에서는 호출하지 않습니다.
  // useCallback(함수, [의존성])은 의존성이 바뀔 때 함수 참조를 갱신합니다. 아래 함수가 사용하는 clearSession을 의존성 배열에 포함합니다.
  const clear = useCallback(() => {
    clearSession()
    setIsLoggedIn(false)
    setIsProfileComplete(false)
  }, [clearSession])

  // 인증 응답을 로컬 상태와 필요 시 전역 저장소에 반영합니다.
  // 응답에 대학 ID가 없으면 fallback을 사용하고, installSession=false이면 저장소 설치를 생략합니다.
  const applyAuth = useCallback((
    nextAuth,
    fallbackUniversityId = null,
    { installSession = true } = {},
  ) => {
    // nextAuth는 로그인·세션 복구에서 새로 받은 인증 응답입니다. next는 현재 상태에 적용할 '다음' 값을 구분합니다.
    // 응답에 user가 없을 수도 있으므로 nextAuth.user를 바로 읽지 않고, optional chaining으로 안전하게 접근합니다.
    // user가 없거나 null이면 이후 코드에서 일관되게 다루도록 null로 정규화합니다.
    // nextUser는 nextAuth에서 꺼낸 사용자 정보로, 기존 전역 user와 구분하기 위한 이름입니다.
    const nextUser = nextAuth?.user ?? null
    const profileUniversityId = universityIdOf(nextUser) ?? fallbackUniversityId

    if (installSession) setSession(nextAuth)
    setMemberName(nextUser?.name || '')
    setMemberDepartment(nextUser?.department || '')
    setMemberUniversityId(profileUniversityId)
    setIsProfileComplete(hasCompletedProfile(nextUser, fallbackUniversityId))
    setIsLoggedIn(true)
  }, [setSession])

  // 최초 진입 시 Google 콜백을 처리하거나 기존 세션을 복구합니다.
  useEffect(() => {
    // API 미사용, 개발 자동 로그인, 인증 확인 단계가 아닌 경우에는 복구하지 않습니다.
    // ref는 같은 훅 인스턴스에서 요청이 한 번만 시작되도록 보장합니다.
    if (!apiEnabled || devAutoLogin || authStatus !== 'checking'
      || bootstrapStarted.current) return undefined
    bootstrapStarted.current = true

    // URL hash에 전달된 Google 로그인 코드를 가져옵니다.
    const params = window.location.hash.startsWith('#')
      ? new URLSearchParams(window.location.hash.slice(1))
      : null
    const code = params?.get('google_login_code')
    if (code) {
      // 코드를 처리한 뒤 주소에서 제거해 새로고침/재사용을 방지합니다.
      window.history.replaceState(
        null,
        document.title,
        `${window.location.pathname}${window.location.search}`,
      )
    }

    // 콜백 코드가 있으면 Google 인증을 교환하고, 없으면 기존 세션을 갱신합니다.
    const restore = code ? exchangeGoogleLogin(code) : refreshSession()
    restore
      // 성공한 인증 정보를 반영합니다. Google 코드 교환 결과는 전역 세션에도 설치합니다.
      .then(nextAuth => applyAuth(nextAuth, null, { installSession: Boolean(code) }))
      .catch(error => {
        // 복구 실패 시 세션을 초기화하고, Google 로그인 실패라면 오류를 알립니다.
        clear()
        if (code) toast.error(error.message || 'Google 로그인에 실패했습니다.')
      })
    return undefined
  }, [apiEnabled, applyAuth, authStatus, clear, devAutoLogin, toast])

  // 이메일 회원가입 또는 로그인을 요청하고 성공 결과를 인증 상태에 반영합니다.
  const login = useCallback(async ({
    mode,
    email,
    password,
    name,
    department,
    universityId,
  }) => {
    // 회원가입은 입력한 프로필 정보도 전달하고, 로그인의 경우 자격 증명만 전달합니다.
    const nextAuth = mode === 'signup'
      ? await signUpWithEmail({ email, password, name, department, universityId })
      : await loginWithEmail(email, password)
    applyAuth(nextAuth, universityId)
  }, [applyAuth])

  // 입력된 프로필을 완료 처리합니다. API와 토큰이 있을 때는 먼저 서버에 저장합니다.
  const completeProfile = useCallback(async () => {
    if (apiEnabled && accessToken) {
      try {
        const updatedUser = await updateMyProfile({
          name: memberName,
          department: memberDepartment,
          university_id: memberUniversityId,
        }, accessToken)
        // 서버 응답의 최신 사용자 정보를 전역 저장소에 반영합니다.
        updateAuthUser(updatedUser)
      } catch (error) {
        // 저장 실패 시 완료 상태를 변경하지 않고 오류 알림 후 종료합니다.
        toast.error(error.message || '회원 정보를 저장하지 못했습니다.')
        return
      }
    }

    // 서버 저장이 필요 없거나 저장에 성공했을 때 프로필을 완료 상태로 표시합니다.
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

  // 서버 로그아웃은 API 사용 시 시도하며, finally를 통해 항상 로컬 상태를 정리합니다.
  const logout = useCallback(async () => {
    try {
      if (apiEnabled) await logoutSession()
    } finally {
      clear()
    }
  }, [apiEnabled, clear])

  // 호출 컴포넌트가 사용할 현재 상태와 인증/프로필 작업들을 반환합니다.
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
