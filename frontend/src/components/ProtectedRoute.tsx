import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Routes where returning users (onboarding done) should not go back
const ONBOARDING_PATHS = ['/onboarding', '/upload']

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, onboardingCompleted } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="text-muted" style={{ fontFamily: 'var(--font-heading)', fontSize: 20 }}>
          Loading…
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Completed users who navigate back to onboarding/upload go straight to dashboard
  if (onboardingCompleted && ONBOARDING_PATHS.includes(location.pathname)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
