import { useEffect, useState } from 'react'
import { adminApi } from '../../lib/adminApi'

interface DashboardData {
  total_users: number
  total_resumes: number
  total_roadmaps: number
  active_ai_calls_24h: number
  total_ai_calls: number
  total_tokens_used: number
  total_estimated_cost_usd: number
}

function StatTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ borderLeft: '1px solid var(--color-divider)', paddingLeft: 12 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-neutral-600)' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-heading)', fontSize: 36, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', color: 'var(--color-accent)' }}>
        {value}
      </div>
      {sub && <div className="text-muted" style={{ fontSize: 12 }}>{sub}</div>}
    </div>
  )
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getDashboard()
      .then(r => { setData(r.data.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  if (!data) return <div className="text-muted">Failed to load dashboard</div>

  return (
    <div>
      <div className="card-kicker">Overview</div>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, marginTop: 4, marginBottom: 32 }}>Dashboard</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 24, marginBottom: 40 }}>
        <StatTile label="Total Users" value={data.total_users} />
        <StatTile label="Total Resumes" value={data.total_resumes} />
        <StatTile label="Total Roadmaps" value={data.total_roadmaps} />
        <StatTile label="AI Calls (24h)" value={data.active_ai_calls_24h} />
        <StatTile label="Total AI Calls" value={data.total_ai_calls} />
        <StatTile label="Tokens Used" value={data.total_tokens_used.toLocaleString()} />
        <StatTile
          label="Estimated Cost"
          value={`$${data.total_estimated_cost_usd.toFixed(4)}`}
          sub="USD all time"
        />
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div className="text-muted" style={{ fontSize: 13, fontStyle: 'italic' }}>Loading…</div>
  )
}
