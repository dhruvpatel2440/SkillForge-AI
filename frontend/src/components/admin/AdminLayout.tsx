import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearAdminKey } from '../../lib/adminApi'

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/resumes', label: 'Resumes' },
  { to: '/admin/roadmaps', label: 'Roadmaps' },
  { to: '/admin/quizzes', label: 'Quizzes' },
  { to: '/admin/interviews', label: 'Interviews' },
  { to: '/admin/ai-usage', label: 'AI Usage' },
  { to: '/admin/audit-logs', label: 'Audit Logs' },
  { to: '/admin/system', label: 'System' },
]

export default function AdminLayout() {
  const navigate = useNavigate()

  const handleSignOut = () => {
    clearAdminKey()
    navigate('/admin/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        background: 'var(--color-bg)',
        borderRight: '1px solid var(--color-divider)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        flexShrink: 0,
      }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--color-divider)' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 19, letterSpacing: '-0.01em', color: 'var(--color-text)' }}>
            SkillForge
          </div>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-accent)', marginTop: 2 }}>
            Admin Panel
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {NAV.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={({ isActive }) => ({
                display: 'block',
                padding: '7px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                fontFamily: 'var(--font-body)',
                color: isActive ? 'var(--color-accent-700)' : 'var(--color-neutral-600)',
                background: isActive ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : 'transparent',
                textDecoration: 'none',
                marginBottom: 2,
                borderLeft: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                transition: 'all 0.15s',
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <NavLink
            to="/dashboard"
            style={{ fontSize: 12, color: 'var(--color-neutral-600)', textDecoration: 'none', fontFamily: 'var(--font-body)' }}
          >
            ← Back to App
          </NavLink>
          <button
            onClick={handleSignOut}
            style={{
              fontSize: 12,
              color: 'var(--color-neutral-600)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              textAlign: 'left',
              fontFamily: 'var(--font-body)',
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', padding: '40px 48px' }}>
        <Outlet />
      </main>
    </div>
  )
}
