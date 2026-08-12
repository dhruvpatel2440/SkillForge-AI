import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error, onboardingCompleted } = await signIn(email, password)
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      // Navigate to dashboard if onboarding is done, otherwise start onboarding
      navigate(onboardingCompleted ? '/dashboard' : '/onboarding', { replace: true })
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '80px auto', padding: '0 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <div className="card-kicker" style={{ marginBottom: 8 }}>Welcome back</div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 40, fontWeight: 400 }}>Sign in</h1>
        <p className="text-muted" style={{ fontSize: 14, marginTop: 8 }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--color-accent-700)' }}>Create one</Link>
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6, color: 'var(--color-neutral-600)' }}>
            Email
          </label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6, color: 'var(--color-neutral-600)' }}>
            Password
          </label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>

        <button className="btn btn-primary btn-block" type="submit" disabled={loading} style={{ marginTop: 8, padding: '12px 0' }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
