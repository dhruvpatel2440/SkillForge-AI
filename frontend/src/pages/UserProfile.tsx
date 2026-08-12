import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { profileApi, resumeApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Loader, User, Briefcase, FileText, LogOut, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

interface ProfileData {
  id: string
  full_name: string | null
  email: string | null
  role: string
  bio: string | null
  location: string | null
  linkedin_url: string | null
  github_url: string | null
  website_url: string | null
  onboarding_completed: boolean
  created_at: string | null
}

interface Prefs {
  target_role: string
  timeline_months: number
  weekly_hours: number
}

interface ResumeStatus {
  resume_id: string
  status: string
  file_name: string
}

// ── Section wrapper ───────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '28px 32px', display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--color-divider)', paddingBottom: 16 }}>
        <span style={{ color: 'var(--color-accent)' }}>{icon}</span>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, margin: 0 }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

// ── Field row ─────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'start', gap: 16 }}>
      <label style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-neutral-600)', paddingTop: 8 }}>
        {label}
      </label>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

// ── Avatar initials ───────────────────────────────────────
function Avatar({ name, size = 72 }: { name: string | null; size?: number }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'color-mix(in srgb, var(--color-accent) 15%, var(--color-bg))',
      border: '2px solid var(--color-accent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-heading)', fontSize: size * 0.36,
      color: 'var(--color-accent)', flexShrink: 0,
      letterSpacing: '0.04em',
    }}>
      {initials}
    </div>
  )
}

export default function UserProfile() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [resume, setResume] = useState<ResumeStatus | null>(null)
  const [loading, setLoading] = useState(true)

  // Edit states
  const [editingInfo, setEditingInfo] = useState(false)
  const [editingPrefs, setEditingPrefs] = useState(false)
  const [savingInfo, setSavingInfo] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)

  // Form fields — personal info
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')

  // Form fields — career prefs
  const [targetRole, setTargetRole] = useState('')
  const [timelineMonths, setTimelineMonths] = useState(3)
  const [weeklyHours, setWeeklyHours] = useState(10)

  useEffect(() => {
    Promise.all([
      profileApi.get(),
      profileApi.getPreferences(),
      resumeApi.getLatestStatus().catch(() => ({ data: { data: null } })),
    ]).then(([pRes, prefRes, rRes]) => {
      const p = pRes.data.data
      setProfile(p)
      setFullName(p?.full_name || '')
      setBio(p?.bio || '')
      setLocation(p?.location || '')
      setLinkedinUrl(p?.linkedin_url || '')
      setGithubUrl(p?.github_url || '')
      setWebsiteUrl(p?.website_url || '')

      const pf = prefRes.data.data
      if (pf) {
        setPrefs(pf)
        setTargetRole(pf.target_role || '')
        setTimelineMonths(pf.timeline_months || 3)
        setWeeklyHours(pf.weekly_hours || 10)
      }

      setResume(rRes.data.data)
    }).catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [])

  const saveInfo = async () => {
    setSavingInfo(true)
    try {
      const res = await profileApi.update({
        full_name: fullName,
        bio: bio || undefined,
        location: location || undefined,
        linkedin_url: linkedinUrl || undefined,
        github_url: githubUrl || undefined,
        website_url: websiteUrl || undefined,
      })
      setProfile(prev => prev ? { ...prev, ...res.data.data } : prev)
      setEditingInfo(false)
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to save profile')
    } finally {
      setSavingInfo(false)
    }
  }

  const savePrefs = async () => {
    setSavingPrefs(true)
    try {
      await profileApi.savePreferences(targetRole, timelineMonths, weeklyHours)
      setPrefs({ target_role: targetRole, timeline_months: timelineMonths, weekly_hours: weeklyHours })
      setEditingPrefs(false)
      toast.success('Career settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSavingPrefs(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out')
    navigate('/login')
  }

  const cancelInfo = () => {
    setFullName(profile?.full_name || '')
    setBio(profile?.bio || '')
    setLocation(profile?.location || '')
    setLinkedinUrl(profile?.linkedin_url || '')
    setGithubUrl(profile?.github_url || '')
    setWebsiteUrl(profile?.website_url || '')
    setEditingInfo(false)
  }

  const cancelPrefs = () => {
    setTargetRole(prefs?.target_role || '')
    setTimelineMonths(prefs?.timeline_months || 3)
    setWeeklyHours(prefs?.weekly_hours || 10)
    setEditingPrefs(false)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-accent)' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—'

  const resumeStatusColor = resume?.status === 'completed' ? 'var(--color-accent)'
    : resume?.status === 'failed' ? '#dc2626' : '#d97706'

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px 80px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 40 }}>
        <Avatar name={profile?.full_name} size={72} />
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 30, margin: 0, marginBottom: 4 }}>
            {profile?.full_name || 'Your Profile'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="text-muted" style={{ fontSize: 13 }}>{profile?.email}</span>
            {profile?.role === 'admin' && (
              <span className="tag tag-accent" style={{ fontSize: 10, letterSpacing: '0.1em' }}>ADMIN</span>
            )}
            <span className="tag tag-neutral" style={{ fontSize: 10, letterSpacing: '0.08em' }}>
              Member since {memberSince}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 20 }}>

        {/* ── Personal Info ── */}
        <Section title="Personal information" icon={<User size={18} />}>
          <Field label="Full name">
            {editingInfo
              ? <input className="input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
              : <span style={{ fontSize: 14 }}>{profile?.full_name || <span className="text-muted" style={{ fontStyle: 'italic' }}>Not set</span>}</span>
            }
          </Field>

          <Field label="Email">
            <span style={{ fontSize: 14 }}>{profile?.email}</span>
            <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>Managed by your account — cannot be changed here</div>
          </Field>

          <Field label="Bio">
            {editingInfo
              ? <textarea className="input" value={bio} onChange={e => setBio(e.target.value)}
                  placeholder="A short bio about yourself…" rows={3}
                  style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }} />
              : <span style={{ fontSize: 14, lineHeight: 1.6 }}>{profile?.bio || <span className="text-muted" style={{ fontStyle: 'italic' }}>Not set</span>}</span>
            }
          </Field>

          <Field label="Location">
            {editingInfo
              ? <input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country" />
              : <span style={{ fontSize: 14 }}>{profile?.location || <span className="text-muted" style={{ fontStyle: 'italic' }}>Not set</span>}</span>
            }
          </Field>

          <Field label="LinkedIn">
            {editingInfo
              ? <input className="input" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/yourname" />
              : profile?.linkedin_url
                ? <a href={profile.linkedin_url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 14, color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {profile.linkedin_url.replace('https://linkedin.com/in/', '')} <ExternalLink size={12} />
                  </a>
                : <span className="text-muted" style={{ fontSize: 14, fontStyle: 'italic' }}>Not set</span>
            }
          </Field>

          <Field label="GitHub">
            {editingInfo
              ? <input className="input" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/yourname" />
              : profile?.github_url
                ? <a href={profile.github_url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 14, color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {profile.github_url.replace('https://github.com/', '')} <ExternalLink size={12} />
                  </a>
                : <span className="text-muted" style={{ fontSize: 14, fontStyle: 'italic' }}>Not set</span>
            }
          </Field>

          <Field label="Website">
            {editingInfo
              ? <input className="input" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://yoursite.com" />
              : profile?.website_url
                ? <a href={profile.website_url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 14, color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {profile.website_url} <ExternalLink size={12} />
                  </a>
                : <span className="text-muted" style={{ fontSize: 14, fontStyle: 'italic' }}>Not set</span>
            }
          </Field>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            {editingInfo ? (
              <>
                <button className="btn btn-secondary" onClick={cancelInfo} disabled={savingInfo}
                  style={{ border: '1px solid var(--color-divider)' }}>Cancel</button>
                <button className="btn btn-primary" onClick={saveInfo} disabled={savingInfo}>
                  {savingInfo ? 'Saving…' : 'Save changes'}
                </button>
              </>
            ) : (
              <button className="btn btn-secondary" onClick={() => setEditingInfo(true)}
                style={{ border: '1px solid var(--color-divider)' }}>Edit</button>
            )}
          </div>
        </Section>

        {/* ── Career Settings ── */}
        <Section title="Career settings" icon={<Briefcase size={18} />}>
          <Field label="Target role">
            {editingPrefs
              ? <input className="input" value={targetRole} onChange={e => setTargetRole(e.target.value)}
                  placeholder="e.g. Full Stack Developer" />
              : <span style={{ fontSize: 14 }}>{prefs?.target_role || <span className="text-muted" style={{ fontStyle: 'italic' }}>Not set</span>}</span>
            }
          </Field>

          <Field label="Timeline">
            {editingPrefs
              ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input className="input" type="number" min={1} max={24}
                    value={timelineMonths} onChange={e => setTimelineMonths(Number(e.target.value))}
                    style={{ width: 80 }} />
                  <span className="text-muted" style={{ fontSize: 13 }}>months</span>
                </div>
              )
              : <span style={{ fontSize: 14 }}>{prefs ? `${prefs.timeline_months} months` : <span className="text-muted" style={{ fontStyle: 'italic' }}>Not set</span>}</span>
            }
          </Field>

          <Field label="Weekly hours">
            {editingPrefs
              ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input className="input" type="number" min={1} max={80}
                    value={weeklyHours} onChange={e => setWeeklyHours(Number(e.target.value))}
                    style={{ width: 80 }} />
                  <span className="text-muted" style={{ fontSize: 13 }}>hours / week</span>
                </div>
              )
              : <span style={{ fontSize: 14 }}>{prefs ? `${prefs.weekly_hours} hrs / week` : <span className="text-muted" style={{ fontStyle: 'italic' }}>Not set</span>}</span>
            }
          </Field>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            {editingPrefs ? (
              <>
                <button className="btn btn-secondary" onClick={cancelPrefs} disabled={savingPrefs}
                  style={{ border: '1px solid var(--color-divider)' }}>Cancel</button>
                <button className="btn btn-primary" onClick={savePrefs} disabled={savingPrefs || !targetRole}>
                  {savingPrefs ? 'Saving…' : 'Save settings'}
                </button>
              </>
            ) : (
              <button className="btn btn-secondary" onClick={() => setEditingPrefs(true)}
                style={{ border: '1px solid var(--color-divider)' }}>Edit</button>
            )}
          </div>
        </Section>

        {/* ── Resume ── */}
        <Section title="Resume" icon={<FileText size={18} />}>
          {resume ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <Field label="File">
                <span style={{ fontSize: 14 }}>{resume.file_name}</span>
              </Field>
              <Field label="Status">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: resumeStatusColor, display: 'inline-block',
                  }} />
                  <span style={{ fontSize: 14, textTransform: 'capitalize' }}>{resume.status}</span>
                </div>
              </Field>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button className="btn btn-secondary" onClick={() => navigate('/upload')}
                  style={{ border: '1px solid var(--color-divider)', fontSize: 13 }}>
                  Upload new resume
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <p className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>No resume uploaded yet</p>
              <button className="btn btn-primary" onClick={() => navigate('/upload')}>Upload resume →</button>
            </div>
          )}
        </Section>

        {/* ── Account ── */}
        <div className="card" style={{ padding: '24px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 4 }}>Sign out</div>
              <div className="text-muted" style={{ fontSize: 12 }}>You will be redirected to the login page</div>
            </div>
            <button
              className="btn btn-ghost"
              onClick={handleSignOut}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                border: '1px solid color-mix(in srgb, #dc2626 35%, var(--color-divider))',
                color: '#dc2626', padding: '8px 16px', fontSize: 13,
              }}
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
