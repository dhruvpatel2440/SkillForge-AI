import { useEffect, useState } from 'react'
import { adminApi } from '../../lib/adminApi'

interface LogRow {
  id: string
  admin_user_id: string
  action: string
  target_type: string | null
  target_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string | null
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<LogRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const PAGE_SIZE = 50

  const load = (p: number) => {
    setLoading(true)
    adminApi.getAuditLogs(p).then(r => {
      setLogs(r.data.data.logs)
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
        Audit Logs <span className="text-muted" style={{ fontSize: 18 }}>({total})</span>
      </h2>

      {loading ? (
        <div className="text-muted" style={{ fontSize: 13, fontStyle: 'italic' }}>Loading…</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="sf-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Metadata</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td className="text-muted">{l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }} className="text-muted">{l.admin_user_id.slice(0, 12)}…</td>
                    <td className="text-accent-dark">{l.action}</td>
                    <td className="text-muted">{l.target_type ? `${l.target_type}/${l.target_id?.slice(0, 8)}…` : '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 10, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="text-muted">
                      {l.metadata ? JSON.stringify(l.metadata) : '—'}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={5} className="text-muted" style={{ textAlign: 'center', fontStyle: 'italic' }}>No audit logs yet</td></tr>
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
