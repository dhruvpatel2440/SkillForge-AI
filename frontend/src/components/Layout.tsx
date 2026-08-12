import React, { useRef, useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Roadmap', path: '/roadmap' },
  { label: 'Gap Analysis', path: '/gap-analysis' },
  { label: 'Projects', path: '/projects' },
  { label: 'Interview', path: '/interview' },
]

function UserMenu() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = (user?.user_metadata?.full_name || user?.email || '?')
    .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  const handleSignOut = async () => {
    setOpen(false)
    await signOut()
    toast.success('Signed out')
    navigate('/login')
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'color-mix(in srgb, var(--color-accent) 15%, var(--color-bg))',
          border: '1.5px solid var(--color-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-heading)', fontSize: 13,
          color: 'var(--color-accent)', cursor: 'pointer',
          letterSpacing: '0.04em', flexShrink: 0,
        }}
        title="Your profile"
      >
        {initials}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          background: 'var(--color-bg)', border: '1px solid var(--color-divider)',
          borderRadius: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
          minWidth: 200, zIndex: 100, overflow: 'hidden',
        }}>
          {/* User info */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-divider)' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 15, marginBottom: 2 }}>
              {user?.user_metadata?.full_name || 'Account'}
            </div>
            <div className="text-muted" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </div>
          </div>

          {/* Menu items */}
          <div style={{ padding: '6px 0' }}>
            <button
              onClick={() => { setOpen(false); navigate('/account') }}
              style={{
                width: '100%', textAlign: 'left', padding: '9px 16px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: 'var(--color-text)',
                fontFamily: 'var(--font-body)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--color-accent) 8%, transparent)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              Manage profile
            </button>
            <button
              onClick={() => { setOpen(false); navigate('/upload') }}
              style={{
                width: '100%', textAlign: 'left', padding: '9px 16px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: 'var(--color-text)',
                fontFamily: 'var(--font-body)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--color-accent) 8%, transparent)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              Upload resume
            </button>
          </div>

          {/* Sign out */}
          <div style={{ borderTop: '1px solid var(--color-divider)', padding: '6px 0' }}>
            <button
              onClick={handleSignOut}
              style={{
                width: '100%', textAlign: 'left', padding: '9px 16px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: '#dc2626',
                fontFamily: 'var(--font-body)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, #dc2626 8%, transparent)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()

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
            <UserMenu />
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
