import { useEffect, useRef, useState } from 'react'
import { adminApi } from '../../lib/adminApi'

interface LiveData {
  window_minutes: number
  since: string
  total_calls: number
  total_tokens: number
  total_cost_usd: number
  avg_latency_ms: number
  success_rate: number
  by_feature: { feature: string; calls: number }[]
  recent_logs: LogRow[]
}

interface ByFeature {
  feature: string
  calls: number
  total_tokens: number
  estimated_cost_usd: number
  avg_latency_ms: number
}

interface ByModel {
  model: string
  calls: number
  total_tokens: number
  estimated_cost_usd: number
}

interface TimelineRow {
  date: string
  calls: number
  total_tokens: number
  estimated_cost_usd: number
}

interface LogRow {
  id: string
  user_id: string | null
  request_id: string
  feature: string
  model: string
  input_tokens: number | null
  output_tokens: number | null
  total_tokens: number | null
  estimated_cost_usd: number
  latency_ms: number
  status: string
  error_message: string | null
  created_at: string | null
}

const REFRESH_MS = 8000
const WINDOW_OPTIONS = [1, 5, 15, 30, 60]

export default function AdminAIUsage() {
  const [live, setLive] = useState<LiveData | null>(null)
  const [liveError, setLiveError] = useState(false)
  const [windowMin, setWindowMin] = useState(5)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [countdown, setCountdown] = useState(REFRESH_MS / 1000)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [byFeature, setByFeature] = useState<ByFeature[]>([])
  const [byModel, setByModel] = useState<ByModel[]>([])
  const [timeline, setTimeline] = useState<TimelineRow[]>([])
  const [histLoading, setHistLoading] = useState(true)

  const [logs, setLogs] = useState<LogRow[]>([])
  const [logsTotal, setLogsTotal] = useState(0)
  const [page, setPage] = useState(1)

  // ── live polling ──────────────────────────────────────────────────────────
  const fetchLive = (minutes: number) => {
    adminApi.getAIUsageLive(minutes)
      .then(r => { setLive(r.data.data); setLiveError(false); setLastRefresh(new Date()) })
      .catch(() => setLiveError(true))
  }

  useEffect(() => {
    fetchLive(windowMin)
    const poll = setInterval(() => fetchLive(windowMin), REFRESH_MS)

    if (countdownRef.current) clearInterval(countdownRef.current)
    setCountdown(REFRESH_MS / 1000)
    countdownRef.current = setInterval(() => {
      setCountdown(c => (c <= 1 ? REFRESH_MS / 1000 : c - 1))
    }, 1000)

    return () => {
      clearInterval(poll)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [windowMin])

  // ── historical data ───────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      adminApi.getAIUsageByFeature(),
      adminApi.getAIUsageByModel(),
      adminApi.getAIUsageTimeline(30),
    ]).then(([f, m, t]) => {
      setByFeature(f.data.data)
      setByModel(m.data.data)
      setTimeline(t.data.data)
      setHistLoading(false)
    }).catch(() => setHistLoading(false))
  }, [])

  useEffect(() => {
    adminApi.getAIUsage({ page, page_size: 30 }).then(r => {
      setLogs(r.data.data.logs)
      setLogsTotal(r.data.data.total)
    })
  }, [page])

  const totalPages = Math.ceil(logsTotal / 30)

  return (
    <div>
      <div className="card-kicker">Admin</div>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, marginTop: 4, marginBottom: 32 }}>AI Usage</h2>

      {/* ── Live Monitor ───────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 32, position: 'relative' }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: liveError ? '#dc2626' : 'var(--color-accent)',
                  display: 'inline-block',
                  animation: liveError ? 'none' : 'sf-pulse 1.6s ease-in-out infinite',
                }}
              />
              <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>
                Live Monitor
              </span>
              {liveError && (
                <span style={{ fontSize: 11, color: '#dc2626' }}>connection error</span>
              )}
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 17, marginTop: 2 }}>
              AI API — last {windowMin} minute{windowMin > 1 ? 's' : ''}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Window selector */}
            <div style={{ display: 'flex', gap: 4 }}>
              {WINDOW_OPTIONS.map(m => (
                <button
                  key={m}
                  onClick={() => setWindowMin(m)}
                  className={`btn ${windowMin === m ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: 11 }}
                >
                  {m}m
                </button>
              ))}
            </div>

            {/* Refresh indicator */}
            <div style={{ fontSize: 11, color: 'var(--color-neutral-600)', textAlign: 'right', minWidth: 80 }}>
              <div>refresh in {countdown}s</div>
              {lastRefresh && (
                <div style={{ fontSize: 10 }}>
                  {lastRefresh.toLocaleTimeString()}
                </div>
              )}
            </div>

            <button
              className="btn btn-secondary"
              onClick={() => fetchLive(windowMin)}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              ↻ Now
            </button>
          </div>
        </div>

        <hr className="hr" style={{ margin: '16px 0' }} />

        {/* Stat tiles */}
        {live ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 20, marginBottom: 20 }}>
              {[
                { label: 'API Calls', value: live.total_calls },
                { label: 'Tokens Used', value: live.total_tokens.toLocaleString() },
                { label: 'Est. Cost', value: `$${live.total_cost_usd.toFixed(5)}` },
                { label: 'Avg Latency', value: `${live.avg_latency_ms}ms` },
                { label: 'Success Rate', value: `${live.success_rate}%`, color: live.success_rate >= 95 ? 'var(--color-accent)' : live.success_rate >= 80 ? '#d97706' : '#dc2626' },
              ].map(stat => (
                <div key={stat.label} style={{ borderLeft: '1px solid var(--color-divider)', paddingLeft: 12 }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--color-neutral-600)' }}>
                    {stat.label}
                  </div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: 28, lineHeight: 1.1, color: stat.color || 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Feature breakdown badges */}
            {live.by_feature.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                {live.by_feature.map(f => (
                  <span key={f.feature} className="tag tag-neutral">
                    {f.feature} <strong style={{ marginLeft: 4, color: 'var(--color-accent-700)' }}>{f.calls}</strong>
                  </span>
                ))}
              </div>
            )}

            {/* Live log feed */}
            {live.recent_logs.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="sf-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Feature</th>
                      <th>Model</th>
                      <th>Tokens</th>
                      <th>Cost</th>
                      <th>Latency</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {live.recent_logs.map(l => (
                      <tr key={l.id}>
                        <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>
                          {l.created_at ? new Date(l.created_at).toLocaleTimeString() : '—'}
                        </td>
                        <td>{l.feature}</td>
                        <td className="text-muted" style={{ fontSize: 11 }}>{l.model}</td>
                        <td>{l.total_tokens?.toLocaleString() ?? '—'}</td>
                        <td>${l.estimated_cost_usd.toFixed(5)}</td>
                        <td className="text-muted">{l.latency_ms}ms</td>
                        <td>
                          <span
                            className={l.status === 'success' ? 'tag tag-accent' : 'tag'}
                            style={l.status !== 'success' ? { background: 'color-mix(in srgb, #dc2626 12%, transparent)', color: '#dc2626' } : {}}
                          >
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-muted" style={{ fontSize: 13, fontStyle: 'italic' }}>
                No AI calls recorded yet. Make an AI request in the app to see live data here.
              </div>
            )}
          </>
        ) : (
          <div className="text-muted" style={{ fontSize: 13, fontStyle: 'italic' }}>
            {liveError ? 'Failed to load live data — is the backend running?' : 'Loading…'}
          </div>
        )}
      </div>

      {/* ── Historical ─────────────────────────────────────────────────────── */}
      {histLoading ? (
        <div className="text-muted" style={{ fontSize: 13, fontStyle: 'italic' }}>Loading historical data…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
            <div className="card">
              <div className="card-kicker">All-time by Feature</div>
              <div style={{ overflowX: 'auto' }}>
                <table className="sf-table">
                  <thead>
                    <tr>
                      <th>Feature</th>
                      <th>Calls</th>
                      <th>Tokens</th>
                      <th>Cost</th>
                      <th>Avg ms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byFeature.map(r => (
                      <tr key={r.feature}>
                        <td>{r.feature}</td>
                        <td>{r.calls}</td>
                        <td>{r.total_tokens.toLocaleString()}</td>
                        <td>${r.estimated_cost_usd.toFixed(5)}</td>
                        <td>{r.avg_latency_ms}</td>
                      </tr>
                    ))}
                    {byFeature.length === 0 && (
                      <tr><td colSpan={5} className="text-muted" style={{ textAlign: 'center', fontStyle: 'italic' }}>No data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <div className="card-kicker">All-time by Model</div>
              <div style={{ overflowX: 'auto' }}>
                <table className="sf-table">
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>Calls</th>
                      <th>Tokens</th>
                      <th>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byModel.map(r => (
                      <tr key={r.model}>
                        <td>{r.model}</td>
                        <td>{r.calls}</td>
                        <td>{r.total_tokens.toLocaleString()}</td>
                        <td>${r.estimated_cost_usd.toFixed(5)}</td>
                      </tr>
                    ))}
                    {byModel.length === 0 && (
                      <tr><td colSpan={4} className="text-muted" style={{ textAlign: 'center', fontStyle: 'italic' }}>No data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 32 }}>
            <div className="card-kicker">Daily Timeline — last 30 days</div>
            {timeline.length === 0 ? (
              <div className="text-muted" style={{ fontSize: 13, fontStyle: 'italic' }}>No data yet</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="sf-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Calls</th>
                      <th>Tokens</th>
                      <th>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeline.map(r => (
                      <tr key={r.date}>
                        <td>{r.date}</td>
                        <td>{r.calls}</td>
                        <td>{r.total_tokens.toLocaleString()}</td>
                        <td>${r.estimated_cost_usd.toFixed(5)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-kicker">All Requests — {logsTotal} total</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="sf-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Feature</th>
                    <th>Model</th>
                    <th>Tokens</th>
                    <th>Cost</th>
                    <th>Latency</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id}>
                      <td className="text-muted">{l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
                      <td>{l.feature}</td>
                      <td className="text-muted" style={{ fontSize: 11 }}>{l.model}</td>
                      <td>{l.total_tokens?.toLocaleString() ?? '—'}</td>
                      <td>${l.estimated_cost_usd.toFixed(5)}</td>
                      <td className="text-muted">{l.latency_ms}ms</td>
                      <td>
                        <span
                          className={l.status === 'success' ? 'tag tag-accent' : 'tag'}
                          style={l.status !== 'success' ? { background: 'color-mix(in srgb, #dc2626 12%, transparent)', color: '#dc2626' } : {}}
                        >
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr><td colSpan={7} className="text-muted" style={{ textAlign: 'center', fontStyle: 'italic' }}>No logs yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
                <button className="btn btn-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
                <span className="text-muted" style={{ fontSize: 13 }}>Page {page} / {totalPages}</span>
                <button className="btn btn-secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
