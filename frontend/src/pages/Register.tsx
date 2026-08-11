import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    const { error } = await signUp(email, password, fullName)
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Account created! Check your email to confirm.')
      navigate('/onboarding')
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '80px auto', padding: '0 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <div className="card-kicker" style={{ marginBottom: 8 }}>Get started</div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 40, fontWeight: 400 }}>Create account</h1>
        <p className="text-muted" style={{ fontSize: 14, marginTop: 8 }}>
          Already have one?{' '}
          <Link to="/login" style={{ color: 'var(--color-accent-700)' }}>Sign in</Link>
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[
          { label: 'Full name', type: 'text', value: fullName, set: setFullName, placeholder: 'Jane Smith', autocomplete: 'name' },
          { label: 'Email', type: 'email', value: email, set: setEmail, placeholder: 'you@example.com', autocomplete: 'email' },
          { label: 'Password', type: 'password', value: password, set: setPassword, placeholder: '8+ characters', autocomplete: 'new-password' },
          { label: 'Confirm password', type: 'password', value: confirm, set: setConfirm, placeholder: '••••••••', autocomplete: 'new-password' },
        ].map(({ label, type, value, set, placeholder, autocomplete }) => (
          <div key={label}>
            <label style={{ display: 'block', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6, color: 'var(--color-neutral-600)' }}>
              {label}
            </label>
            <input
              className="input"
              type={type}
              value={value}
              onChange={(e) => set(e.target.value)}
              required
              placeholder={placeholder}
              autoComplete={autocomplete}
            />
          </div>
        ))}

        <button className="btn btn-primary btn-block" type="submit" disabled={loading} style={{ marginTop: 8, padding: '12px 0' }}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </div>
  )
}
