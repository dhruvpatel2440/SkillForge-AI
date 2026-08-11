import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogOut } from 'lucide-react'
import toast from 'react-hot-toast'

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Roadmap', path: '/roadmap' },
  { label: 'Gap Analysis', path: '/gap-analysis' },
  { label: 'Interview', path: '/interview' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out')
    navigate('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <nav className="sf-nav">
        <Link to={user ? '/dashboard' : '/'} className="sf-nav-brand">
          SkillForge<span style={{ color: 'var(--color-accent)' }}> AI</span>
        </Link>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  fontSize: 13,
                  letterSpacing: '0.02em',
                  color: location.pathname.startsWith(item.path)
                    ? 'var(--color-accent-700)'
                    : undefined,
                  fontWeight: location.pathname.startsWith(item.path) ? 500 : 400,
                }}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={handleSignOut}
              className="btn btn-ghost"
              style={{ padding: '6px 8px' }}
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}

        {!user && (
          <div className="text-muted" style={{ fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Evidence-linked skill roadmaps
          </div>
        )}
      </nav>

      <main>{children}</main>
    </div>
  )
}
