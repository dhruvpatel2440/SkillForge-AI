import { useEffect, useState } from 'react'
import { adminApi } from '../../lib/adminApi'

function StatusBadge({ s }: { s: string }) {
  const cls = s === 'completed' ? 'tag tag-accent' : s === 'failed' ? 'tag' : 'tag tag-neutral'
  const style = s === 'failed' ? { background: 'color-mix(in srgb, #dc2626 12%, transparent)', color: '#dc2626' } : {}
  return <span className={cls} style={style}>{s}</span>
}

function Pager({ page, totalPages, setPage }: { page: number; totalPages: number; setPage: (fn: (p: number) => number) => void }) {
  if (totalPages <= 1) return null
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 20, alignItems: 'center' }}>
      <button className="btn btn-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
      <span className="text-muted" style={{ fontSize: 13 }}>Page {page} / {totalPages}</span>
      <button className="btn btn-secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
    </div>
  )
}

export default function AdminResumes() {
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = (p: number) => {
    setLoading(true)
    adminApi.getResumes(p).then(r => {
      setItems(r.data.data.resumes)
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
        Resumes <span className="text-muted" style={{ fontSize: 18 }}>({total})</span>
      </h2>

      {loading ? (
        <div className="text-muted" style={{ fontSize: 13, fontStyle: 'italic' }}>Loading…</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="sf-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>User</th>
                  <th>Status</th>
                  <th>Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {items.map(r => (
                  <tr key={r.id}>
                    <td>{r.file_name}</td>
                    <td className="text-muted" style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.user_id.slice(0, 12)}…</td>
                    <td><StatusBadge s={r.processing_status} /></td>
                    <td className="text-muted">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={4} className="text-muted" style={{ textAlign: 'center', fontStyle: 'italic' }}>None yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pager page={page} totalPages={totalPages} setPage={setPage} />
        </>
      )}
    </div>
  )
}
