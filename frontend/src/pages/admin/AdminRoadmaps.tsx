import { useEffect, useState } from 'react'
import { adminApi } from '../../lib/adminApi'

export default function AdminRoadmaps() {
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = (p: number) => {
    setLoading(true)
    adminApi.getRoadmaps(p).then(r => {
      setItems(r.data.data.roadmaps)
      setTotal(r.data.data.total)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load(page) }, [page])
  const totalPages = Math.ceil(total / 20)

  return (
    <div>
      <div className="card-kicker">Admin</div>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, marginTop: 4, marginBottom: 24 }}>
        Roadmaps <span className="text-muted" style={{ fontSize: 18 }}>({total})</span>
      </h2>

      {loading ? (
        <div className="text-muted" style={{ fontSize: 13, fontStyle: 'italic' }}>Loading…</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="sf-table">
              <thead>
                <tr>
                  <th>Target Role</th>
                  <th>User</th>
                  <th>Weeks</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {items.map(r => (
                  <tr key={r.id}>
                    <td>{r.target_role}</td>
                    <td className="text-muted" style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.user_id.slice(0, 12)}…</td>
                    <td>{r.duration_weeks}</td>
                    <td className="text-muted">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={4} className="text-muted" style={{ textAlign: 'center', fontStyle: 'italic' }}>None yet</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 20, alignItems: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
              <span className="text-muted" style={{ fontSize: 13 }}>Page {page} / {totalPages}</span>
              <button className="btn btn-secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
