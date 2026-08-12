import { useEffect, useState } from 'react'
import { adminApi } from '../../lib/adminApi'

export default function AdminInterviews() {
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = (p: number) => {
    setLoading(true)
    adminApi.getInterviews(p).then(r => {
      setItems(r.data.data.attempts)
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
        Interview Attempts <span className="text-muted" style={{ fontSize: 18 }}>({total})</span>
      </h2>

      {loading ? (
        <div className="text-muted" style={{ fontSize: 13, fontStyle: 'italic' }}>Loading…</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="sf-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Score</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map(a => (
                  <tr key={a.id}>
                    <td className="text-muted" style={{ fontFamily: 'monospace', fontSize: 11 }}>{a.user_id.slice(0, 12)}…</td>
                    <td>{a.score ?? '—'}</td>
                    <td className="text-muted">{a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={3} className="text-muted" style={{ textAlign: 'center', fontStyle: 'italic' }}>None yet</td></tr>
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
