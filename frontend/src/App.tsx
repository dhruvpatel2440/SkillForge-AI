import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Onboarding from './pages/Onboarding'
import Upload from './pages/Upload'
import SkillProfile from './pages/SkillProfile'
import GapAnalysis from './pages/GapAnalysis'
import Roadmap from './pages/Roadmap'
import WeekDetail from './pages/WeekDetail'
import Interview from './pages/Interview'
import Dashboard from './pages/Dashboard'

function FullPageSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="text-muted" style={{ fontFamily: 'var(--font-heading)', fontSize: 18 }}>
        Loading…
      </div>
    </div>
  )
}

// Wraps public routes: redirects logged-in users to the right destination
function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, loading, onboardingCompleted } = useAuth()
  if (loading) return <FullPageSpinner />
  if (user) {
    return <Navigate to={onboardingCompleted ? '/dashboard' : '/onboarding'} replace />
  }
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<AuthRedirect><Landing /></AuthRedirect>} />
        <Route path="/login" element={<AuthRedirect><Login /></AuthRedirect>} />
        <Route path="/register" element={<AuthRedirect><Register /></AuthRedirect>} />

        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><SkillProfile /></ProtectedRoute>} />
        <Route path="/gap-analysis" element={<ProtectedRoute><GapAnalysis /></ProtectedRoute>} />
        <Route path="/roadmap" element={<ProtectedRoute><Roadmap /></ProtectedRoute>} />
        <Route path="/roadmap/week/:weekId" element={<ProtectedRoute><WeekDetail /></ProtectedRoute>} />
        <Route path="/interview" element={<ProtectedRoute><Interview /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-divider)',
            },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
