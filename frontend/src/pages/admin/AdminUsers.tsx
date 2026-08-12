import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../../lib/adminApi'

interface UserRow {
  id: string
  user_id: string
  full_name: string | null
  email: string | null
  role: string
  onboarding_completed: boolean
  created_at: string | null
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const PAGE_SIZE = 20

  const load = (p: number) => {
    setLoading(true)
    adminApi.getUsers(p, PAGE_SIZE).then(r => {
      setUsers(r.data.data.users)
      setTotal(r.data.data.total)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load(page) }, [page])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <div className="card-kicker">Admin</div>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, marginTop: 4, marginBottom: 24 }}>
        Users <span className="text-muted" style={{ fontSize: 18 }}>({total})</span>
      </h2>

      {loading ? (
        <div className="text-muted" style={{ fontSize: 13, fontStyle: 'italic' }}>Loading…</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="sf-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Onboarded</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.full_name || '—'}</td>
                    <td className="text-muted">{u.email || '—'}</td>
                    <td>
                      <span className={u.role === 'admin' ? 'tag tag-accent' : 'tag tag-neutral'}>
                        {u.role}
                      </span>
                    </td>
                    <td className="text-muted">{u.onboarding_completed ? '✓' : '—'}</td>
                    <td className="text-muted">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                    <td>
                      <Link to={`/admin/users/${u.user_id}`} className="text-accent-dark" style={{ fontSize: 12 }}>
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-muted" style={{ textAlign: 'center', fontStyle: 'italic' }}>No users</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 20, alignItems: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </button>
              <span className="text-muted" style={{ fontSize: 13 }}>Page {page} / {totalPages}</span>
              <button
                className="btn btn-secondary"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
