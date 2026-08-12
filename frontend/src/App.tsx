import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import AdminLayout from './components/admin/AdminLayout'

const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Upload = lazy(() => import('./pages/Upload'))
const SkillProfile = lazy(() => import('./pages/SkillProfile'))
const GapAnalysis = lazy(() => import('./pages/GapAnalysis'))
const Roadmap = lazy(() => import('./pages/Roadmap'))
const WeekDetail = lazy(() => import('./pages/WeekDetail'))
const Interview = lazy(() => import('./pages/Interview'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const UserProfile = lazy(() => import('./pages/UserProfile'))
const Projects = lazy(() => import('./pages/Projects'))
const Quiz = lazy(() => import('./pages/Quiz'))

const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminUserDetail = lazy(() => import('./pages/admin/AdminUserDetail'))
const AdminResumes = lazy(() => import('./pages/admin/AdminResumes'))
const AdminRoadmaps = lazy(() => import('./pages/admin/AdminRoadmaps'))
const AdminQuizzes = lazy(() => import('./pages/admin/AdminQuizzes'))
const AdminInterviews = lazy(() => import('./pages/admin/AdminInterviews'))
const AdminAIUsage = lazy(() => import('./pages/admin/AdminAIUsage'))
const AdminAuditLogs = lazy(() => import('./pages/admin/AdminAuditLogs'))
const AdminSystem = lazy(() => import('./pages/admin/AdminSystem'))

function FullPageSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="text-muted" style={{ fontFamily: 'var(--font-heading)', fontSize: 18 }}>
        Loading…
      </div>
    </div>
  )
}

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
    <Suspense fallback={<FullPageSpinner />}>
    <Routes>
      {/* Admin login — no auth required */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Admin routes — own layout, no app chrome */}
      <Route
        path="/admin"
        element={<AdminRoute><AdminLayout /></AdminRoute>}
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:userId" element={<AdminUserDetail />} />
        <Route path="resumes" element={<AdminResumes />} />
        <Route path="roadmaps" element={<AdminRoadmaps />} />
        <Route path="quizzes" element={<AdminQuizzes />} />
        <Route path="interviews" element={<AdminInterviews />} />
        <Route path="ai-usage" element={<AdminAIUsage />} />
        <Route path="audit-logs" element={<AdminAuditLogs />} />
        <Route path="system" element={<AdminSystem />} />
      </Route>

      {/* Quiz — standalone page, no app chrome */}
      <Route path="/quiz/:weekId" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />

      {/* Main app routes */}
      <Route path="*" element={
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
            <Route path="/account" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      } />
    </Routes>
    </Suspense>
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
