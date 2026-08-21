import { BrowserRouter } from 'react-router'
import AppRouter from './app/AppRouter.jsx'
import { useAuthBootstrap } from './hooks/useAuthBootstrap.js'
import { useToast } from './components/toast.js'

const DEV_AUTO_LOGIN = import.meta.env.VITE_AUTO_LOGIN === 'true'

export function AppContent() {
  const toast = useToast()
  const auth = useAuthBootstrap({
    enabled: import.meta.env.VITE_API_MODE !== 'mock',
    autoLogin: DEV_AUTO_LOGIN,
    onGoogleError: error => toast.error(error.message || 'Google 로그인에 실패했습니다.'),
  })

  return <AppRouter auth={auth} />
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
