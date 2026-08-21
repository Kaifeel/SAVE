import { Route, Routes } from 'react-router'
import MarketplaceLayout from '../layouts/MarketplaceLayout.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'

export default function AppRouter({ auth }) {
  return (
    <Routes>
      <Route path="/login" element={<MarketplaceLayout auth={auth} />} />
      <Route
        element={(
          <ProtectedRoute
            authStatus={auth.authStatus}
            isProfileComplete={auth.isProfileComplete}
            requireProfile={false}
          />
        )}
      >
        <Route path="/profile/setup" element={<MarketplaceLayout auth={auth} />} />
        <Route path="/admin/*" element={<MarketplaceLayout auth={auth} />} />
      </Route>
      <Route
        element={(
          <ProtectedRoute
            authStatus={auth.authStatus}
            isProfileComplete={auth.isProfileComplete}
          />
        )}
      >
        <Route path="*" element={<MarketplaceLayout auth={auth} />} />
      </Route>
    </Routes>
  )
}
