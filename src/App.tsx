import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Home } from './pages/Home'
import { Practice } from './pages/Practice'
import { ProfileSelect } from './pages/ProfileSelect'
import { Results } from './pages/Results'
import { Setup } from './pages/Setup'
import { WeakWords } from './pages/WeakWords'
import { WordLibrary } from './pages/WordLibrary'
import { hasActiveProfile } from './utils/profileStorage'

function RootRedirect() {
  return <Navigate to={hasActiveProfile() ? '/home' : '/profile'} replace />
}

function ProtectedRoutes() {
  if (!hasActiveProfile()) {
    return <Navigate to="/profile" replace />
  }

  return <Outlet />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/profile" element={<ProfileSelect />} />
        <Route element={<ProtectedRoutes />}>
          <Route path="/home" element={<Home />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/library" element={<WordLibrary />} />
          <Route path="/weak-words" element={<WeakWords />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/results" element={<Results />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
