import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminLogin, setAdminKey } from '../../lib/adminApi'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await adminLogin(password)
      setAdminKey(res.data.data.token)
      navigate('/admin')
    } catch {
      setError('Invalid password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 28,
            color: 'var(--color-text)',
            marginBottom: 4,
          }}>
            SkillForge
          </div>
          <div style={{
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--color-accent)',
          }}>
            Admin Access
          </div>
          <p className="text-muted" style={{ fontSize: 13, marginTop: 12 }}>
            Enter the admin password to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ gap: 16 }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-neutral-600)',
              marginBottom: 6,
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Admin password"
              autoFocus
              className="input"
            />
          </div>

          {error && (
            <div style={{ fontSize: 13, color: '#dc2626' }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="btn btn-primary btn-block"
            style={{ padding: '10px 0', fontSize: 14, marginTop: 4 }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
