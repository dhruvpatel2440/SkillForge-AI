import { useEffect, useState } from 'react'
import { adminApi } from '../../lib/adminApi'

interface QuizRow {
  id: string
  user_id: string
  title: string
  passing_score: number
  question_count: number
  created_at: string | null
  attempt_count: number
  best_score: number | null
  latest_score: number | null
  average_score: number | null
  passed: boolean | null
  last_attempt_at: string | null
}

function scoreColor(score: number, passing: number) {
  if (score >= passing) return 'var(--color-accent-700)'
  if (score >= passing * 0.7) return '#d97706'
  return '#dc2626'
}

export default function AdminQuizzes() {
  const [items, setItems] = useState<QuizRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = (p: number) => {
    setLoading(true)
    adminApi.getQuizzes(p).then(r => {
      setItems(r.data.data.quizzes)
      setTotal(r.data.data.total)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load(page) }, [page])
  const totalPages = Math.ceil(total / 20)

  // Roll-up across the quizzes on this page that actually have attempts.
  const attempted = items.filter(q => q.attempt_count > 0 && q.best_score !== null)
  const passedCount = attempted.filter(q => q.passed).length
  const avgBest = attempted.length
    ? Math.round(attempted.reduce((s, q) => s + (q.best_score || 0), 0) / attempted.length)
    : null

  return (
    <div>
      <div className="card-kicker">Admin</div>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, marginTop: 4, marginBottom: 24 }}>
        Quizzes <span className="text-muted" style={{ fontSize: 18 }}>({total})</span>
      </h2>

      {loading ? (
        <div className="text-muted" style={{ fontSize: 13, fontStyle: 'italic' }}>Loading…</div>
      ) : (
        <>
          {/* Summary tiles */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, marginBottom: 28 }}>
            {[
              { label: 'Attempted', value: `${attempted.length} / ${items.length}` },
              { label: 'Passed', value: attempted.length ? `${passedCount} / ${attempted.length}` : '—' },
              { label: 'Avg best score', value: avgBest !== null ? `${avgBest}%` : '—' },
            ].map(s => (
              <div key={s.label} style={{ borderLeft: '1px solid var(--color-divider)', paddingLeft: 14 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--color-neutral-600)' }}>
                  {s.label}
                </div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 26, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="sf-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>User</th>
                  <th style={{ textAlign: 'right' }}>Attempts</th>
                  <th style={{ textAlign: 'right' }}>Latest</th>
                  <th style={{ textAlign: 'right' }}>Best</th>
                  <th style={{ textAlign: 'right' }}>Avg</th>
                  <th>Result</th>
                  <th style={{ textAlign: 'right' }}>Pass mark</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {items.map(q => {
                  const taken = q.attempt_count > 0 && q.best_score !== null
                  return (
                    <tr key={q.id}>
                      <td>
                        {q.title}
                        {q.question_count > 0 && (
                          <span className="text-muted" style={{ fontSize: 11, marginLeft: 6 }}>
                            · {q.question_count}Q
                          </span>
                        )}
                      </td>
                      <td className="text-muted" style={{ fontFamily: 'monospace', fontSize: 11 }}>
                        {q.user_id.slice(0, 12)}…
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {q.attempt_count || <span className="text-muted">—</span>}
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {taken ? (
                          <span style={{ color: scoreColor(q.latest_score!, q.passing_score) }}>
                            {q.latest_score}%
                          </span>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {taken ? (
                          <strong style={{ color: scoreColor(q.best_score!, q.passing_score) }}>
                            {q.best_score}%
                          </strong>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td className="text-muted" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {taken ? `${q.average_score}%` : '—'}
                      </td>
                      <td>
                        {!taken ? (
                          <span className="tag tag-neutral">Not taken</span>
                        ) : q.passed ? (
                          <span className="tag tag-accent">Passed</span>
                        ) : (
                          <span
                            className="tag"
                            style={{ background: 'color-mix(in srgb, #dc2626 12%, transparent)', color: '#dc2626' }}
                          >
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="text-muted" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {q.passing_score}%
                      </td>
                      <td className="text-muted">
                        {q.created_at ? new Date(q.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  )
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-muted" style={{ textAlign: 'center', fontStyle: 'italic' }}>
                      None yet
                    </td>
                  </tr>
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
