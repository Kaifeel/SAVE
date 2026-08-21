import { Navigate, Outlet, useLocation } from 'react-router'

export default function ProtectedRoute({
  authStatus,
  isProfileComplete,
  requireProfile = true,
}) {
  const location = useLocation()

  if (authStatus === 'checking') {
    return <main>로그인 상태 확인 중...</main>
  }

  if (authStatus !== 'authenticated') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  if (requireProfile && !isProfileComplete) {
    return <Navigate to="/profile/setup" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
