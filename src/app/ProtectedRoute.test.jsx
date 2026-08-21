import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router'
import ProtectedRoute from './ProtectedRoute.jsx'

afterEach(cleanup)

function LocationState() {
  const location = useLocation()
  return <output>{location.state?.from || 'none'}</output>
}

function renderBoundary({ authStatus, isProfileComplete = true }) {
  render(
    <MemoryRouter initialEntries={['/rentals']}>
      <Routes>
        <Route path="/login" element={<><p>로그인 화면</p><LocationState /></>} />
        <Route path="/profile/setup" element={<p>프로필 화면</p>} />
        <Route element={(
          <ProtectedRoute
            authStatus={authStatus}
            isProfileComplete={isProfileComplete}
          />
        )}>
          <Route path="/rentals" element={<p>대여 내역</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('세션 확인 중에는 로그인 리다이렉트 대신 확인 상태를 렌더링한다', () => {
    renderBoundary({ authStatus: 'checking' })

    expect(screen.getByText('로그인 상태 확인 중...')).toBeInTheDocument()
    expect(screen.queryByText('로그인 화면')).not.toBeInTheDocument()
  })

  it('인증되지 않으면 요청 경로를 보존해 로그인으로 이동한다', () => {
    renderBoundary({ authStatus: 'unauthenticated' })

    expect(screen.getByText('로그인 화면')).toBeInTheDocument()
    expect(screen.getByText('/rentals')).toBeInTheDocument()
  })

  it('프로필이 미완성이면 설정 화면으로 이동한다', () => {
    renderBoundary({ authStatus: 'authenticated', isProfileComplete: false })

    expect(screen.getByText('프로필 화면')).toBeInTheDocument()
  })

  it('인증과 프로필이 완료되면 요청 화면을 렌더링한다', () => {
    renderBoundary({ authStatus: 'authenticated' })

    expect(screen.getByText('대여 내역')).toBeInTheDocument()
  })
})
