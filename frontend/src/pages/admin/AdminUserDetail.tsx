import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { adminApi } from '../../lib/adminApi'

interface UserDetail {
  user_id: string
  full_name: string | null
  email: string | null
  role: string
  onboarding_completed: boolean
  created_at: string | null
  resume_count: number
  roadmap_count: number
  ai_call_count: number
}

export default function AdminUserDetail() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [newRole, setNewRole] = useState('')

  useEffect(() => {
    if (!userId) return
    adminApi.getUser(userId).then(r => {
      setUser(r.data.data)
      setNewRole(r.data.data.role)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [userId])

  const handleRoleUpdate = async () => {
    if (!userId || !user) return
    setSaving(true)
    try {
      await adminApi.updateUserRole(userId, newRole)
      setUser({ ...user, role: newRole })
      alert('Role updated')
    } catch {
      alert('Failed to update role')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!userId) return
    if (!confirm('Permanently delete this user and all their data?')) return
    setDeleting(true)
    try {
      await adminApi.deleteUser(userId)
      navigate('/admin/users')
    } catch {
      alert('Failed to delete user')
      setDeleting(false)
    }
  }

  if (loading) return <div className="text-muted" style={{ fontSize: 13, fontStyle: 'italic' }}>Loading…</div>
  if (!user) return <div style={{ color: '#dc2626' }}>User not found</div>

  return (
    <div style={{ maxWidth: 600 }}>
      <button className="btn btn-ghost" onClick={() => navigate('/admin/users')} style={{ marginBottom: 24 }}>
        ← Back
      </button>

      <div className="card-kicker">User</div>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, marginTop: 4, marginBottom: 24 }}>
        {user.full_name || user.email || user.user_id}
      </h2>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-kicker">Details</div>
        {[
          { label: 'Email', value: user.email || '—' },
          { label: 'User ID', value: user.user_id },
          { label: 'Role', value: user.role },
          { label: 'Onboarding', value: user.onboarding_completed ? 'Completed' : 'Incomplete' },
          { label: 'Joined', value: user.created_at ? new Date(user.created_at).toLocaleString() : '—' },
          { label: 'Resumes', value: user.resume_count },
          { label: 'Roadmaps', value: user.roadmap_count },
          { label: 'AI Calls', value: user.ai_call_count },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-divider)', fontSize: 13 }}>
            <span className="text-muted">{label}</span>
            <span>{value}</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-kicker">Change Role</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
          <select
            value={newRole}
            onChange={e => setNewRole(e.target.value)}
            className="input"
            style={{ width: 'auto' }}
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
          <button
            className="btn btn-primary"
            onClick={handleRoleUpdate}
            disabled={saving || newRole === user.role}
          >
            {saving ? 'Saving…' : 'Update Role'}
          </button>
        </div>
      </div>

      <div className="card" style={{ borderColor: 'color-mix(in srgb, #dc2626 30%, var(--color-divider))' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#dc2626' }}>
          Danger Zone
        </div>
        <div className="text-muted" style={{ fontSize: 13 }}>
          Permanently deletes the user and all associated data.
        </div>
        <button
          className="btn"
          onClick={handleDelete}
          disabled={deleting}
          style={{ borderColor: '#dc2626', color: '#dc2626', alignSelf: 'flex-start' }}
        >
          {deleting ? 'Deleting…' : 'Delete User'}
        </button>
      </div>
    </div>
  )
}
