import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { profileApi } from '../lib/api'
import toast from 'react-hot-toast'

const ROLES = [
  { id: 'Full Stack Developer', meta: '1,240 open roles' },
  { id: 'Frontend Developer', meta: '980 open roles' },
  { id: 'Backend Developer', meta: '860 open roles' },
  { id: 'Data Analyst', meta: '920 open roles' },
  { id: 'Data Scientist', meta: '760 open roles' },
  { id: 'Cybersecurity Analyst', meta: '610 open roles' },
  { id: 'Cloud Engineer', meta: '840 open roles' },
  { id: 'DevOps Engineer', meta: '720 open roles' },
  { id: 'AI/ML Engineer', meta: '890 open roles' },
]

const TIMELINES = [1, 3, 6, 12]
const HOURS = [5, 10, 15, 20]

const STEP_LABELS = ['Target role', 'Timeline', 'Weekly hours']

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [role, setRole] = useState('')
  const [customRole, setCustomRole] = useState('')
  const [timeline, setTimeline] = useState(0)
  const [hours, setHours] = useState(0)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  const finalRole = role === '__custom__' ? customRole : role

  const canNext =
    (step === 0 && (role !== '' && (role !== '__custom__' || customRole.trim()))) ||
    (step === 1 && timeline > 0) ||
    (step === 2 && hours > 0)

  const handleNext = async () => {
    if (step < 2) {
      setStep(step + 1)
      return
    }
    setSaving(true)
    try {
      await profileApi.savePreferences(finalRole, timeline, hours)
      toast.success('Preferences saved!')
      navigate('/upload')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const btnStyle = (active: boolean) => ({
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    padding: '16px',
    border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-divider)'}`,
    borderRadius: 'var(--radius-md)',
    background: active ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)' : 'transparent',
    cursor: 'pointer',
    gap: 4,
    transition: 'all 0.15s',
  })

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
      {/* Steps indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
        {STEP_LABELS.map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 28, height: 28,
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13,
              border: `1px solid ${i <= step ? 'var(--color-accent)' : 'var(--color-divider)'}`,
              background: i < step ? 'var(--color-accent)' : 'transparent',
              color: i < step ? 'var(--color-bg)' : i === step ? 'var(--color-accent-700)' : 'var(--color-neutral-600)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {i < step ? '✓' : i + 1}
            </span>
            <span style={{ fontSize: 13, color: i === step ? 'var(--color-text)' : 'var(--color-neutral-600)' }}>
              {label}
            </span>
            {i < 2 && <span style={{ width: 24, height: 1, background: 'var(--color-divider)', display: 'block' }} />}
          </div>
        ))}
      </div>

      {/* Step 0 — Role */}
      {step === 0 && (
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 34, marginBottom: 8 }}>Which role are you aiming at?</h2>
          <p className="text-muted" style={{ fontSize: 14, maxWidth: '56ch', marginBottom: 24 }}>
            This selects the job-description corpus your resume is diffed against.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
            {ROLES.map((r) => (
              <button key={r.id} onClick={() => setRole(r.id)} style={btnStyle(role === r.id)}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 18 }}>{r.id}</span>
                <span className="text-muted" style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{r.meta}</span>
              </button>
            ))}
            <button onClick={() => setRole('__custom__')} style={btnStyle(role === '__custom__')}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 18 }}>Other role</span>
              <span className="text-muted" style={{ fontSize: 12 }}>Enter a custom role</span>
            </button>
          </div>
          {role === '__custom__' && (
            <input
              className="input"
              style={{ marginTop: 12 }}
              placeholder="e.g. Product Manager, iOS Developer…"
              value={customRole}
              onChange={(e) => setCustomRole(e.target.value)}
              autoFocus
            />
          )}
        </div>
      )}

      {/* Step 1 — Timeline */}
      {step === 1 && (
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 34, marginBottom: 8 }}>How long do you have?</h2>
          <p className="text-muted" style={{ fontSize: 14, maxWidth: '56ch', marginBottom: 24 }}>
            Timeline sets how many gaps the roadmap can realistically close, and in what order.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            {TIMELINES.map((t) => (
              <button key={t} onClick={() => setTimeline(t)} style={{ ...btnStyle(timeline === t), alignItems: 'center', minWidth: 100 }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 30, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{t}</span>
                <span className="text-muted" style={{ fontSize: 12 }}>month{t !== 1 ? 's' : ''}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2 — Hours */}
      {step === 2 && (
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 34, marginBottom: 8 }}>Hours per week?</h2>
          <p className="text-muted" style={{ fontSize: 14, maxWidth: '56ch', marginBottom: 24 }}>
            Module density. Five hours buys one concept plus one mini-project; twenty buys a portfolio project alongside it.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            {HOURS.map((h) => (
              <button key={h} onClick={() => setHours(h)} style={{ ...btnStyle(hours === h), alignItems: 'center', minWidth: 100 }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 30, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{h}</span>
                <span className="text-muted" style={{ fontSize: 12 }}>hrs / week</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <hr className="hr" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-ghost" onClick={() => step > 0 ? setStep(step - 1) : null} disabled={step === 0}>
          ← Back
        </button>
        <button className="btn btn-primary" onClick={handleNext} disabled={!canNext || saving}>
          {saving ? 'Saving…' : step === 2 ? 'Upload Resume →' : 'Next →'}
        </button>
      </div>
    </div>
  )
}
