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
    <div className="sf-admin-shell">
      {/* Sidebar — becomes a horizontal tab strip on mobile */}
      <aside className="sf-admin-side">
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--color-divider)' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 19, letterSpacing: '-0.01em', color: 'var(--color-text)' }}>
            SkillForge
          </div>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-accent)', marginTop: 2 }}>
            Admin Panel
          </div>
        </div>

        <nav className="sf-admin-nav">
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

        <div className="sf-admin-foot">
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
      <main className="sf-admin-main">
        <Outlet />
      </main>
    </div>
  )
}
