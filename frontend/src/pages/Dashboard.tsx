import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardApi } from '../lib/api'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Loader, ArrowRight, Map, BarChart2, MessageSquare, FileUp } from 'lucide-react'
import toast from 'react-hot-toast'

interface DashboardData {
  target_role: string | null
  readiness_score: number
  roadmap_progress: number
  current_week: { number: number; title: string; phase: string; id: string } | null
  skills_mastered: number
  skills_in_progress: number
  critical_gaps: any[]
  upcoming_tasks: any[]
  latest_quiz_score: number | null
  interview_prep_score: number
  score_breakdown: Record<string, number>
  total_weeks: number
  completed_weeks: number
}

const BREAKDOWN_MAX: Record<string, number> = {
  technical_skills: 35, projects_evidence: 25,
  experience: 15, role_requirements: 15, certifications_achievements: 10,
}
const BREAKDOWN_SHORT: Record<string, string> = {
  technical_skills: 'Technical', projects_evidence: 'Projects',
  experience: 'Experience', role_requirements: 'Role Fit', certifications_achievements: 'Certs',
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    dashboardApi.get()
      .then((r) => setData(r.data.data))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  if (!data?.target_role) {
    return (
      <div style={{ maxWidth: 520, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 34, marginBottom: 12 }}>Welcome to SkillForge AI</h2>
        <p className="text-muted" style={{ fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
          Set your career preferences and upload your resume to get your personalised roadmap.
        </p>
        <div style={{ display: 'grid', gap: 10 }}>
          <button className="btn btn-primary btn-block" onClick={() => navigate('/onboarding')} style={{ padding: '14px 0', fontSize: 15 }}>
            Set career preferences →
          </button>
          <button className="btn btn-secondary btn-block" onClick={() => navigate('/upload')}>
            Upload resume
          </button>
        </div>
      </div>
    )
  }

  const scoreColor = data.readiness_score >= 70 ? '#b68235' : data.readiness_score >= 40 ? '#d97706' : '#dc2626'

  const chartData = Object.entries(data.score_breakdown || {}).map(([key, value]) => {
    const max = BREAKDOWN_MAX[key] ?? 35
    const your = Math.round((Number(value) / max) * 100)
    return { name: BREAKDOWN_SHORT[key] || key, your, target: 100 }
  })

  const sparkBars = chartData.map(d => d.your)

  const QUICK_ACTIONS = [
    { label: 'Roadmap',       icon: <Map size={15} />,          path: '/roadmap' },
    { label: 'Gap analysis',  icon: <BarChart2 size={15} />,    path: '/gap-analysis' },
    { label: 'Interview',     icon: <MessageSquare size={15} />, path: '/interview' },
    { label: 'Update resume', icon: <FileUp size={15} />,       path: '/upload' },
  ]

  return (
    <div className="sf-page">

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div className="card-kicker" style={{ marginBottom: 4 }}>{data.target_role}</div>
        <h2 className="sf-h2" style={{ fontSize: 'clamp(28px, 5vw, 40px)', margin: 0 }}>Dashboard</h2>
      </div>

      {/* ── Stat tiles ── */}
      <div className="sf-stat-row" style={{ marginBottom: 36, borderBottom: '1px solid var(--color-divider)', paddingBottom: 28 }}>
        {[
          { label: 'Readiness score', value: String(data.readiness_score), sub: 'out of 100', color: scoreColor },
          { label: 'Roadmap progress', value: `${data.roadmap_progress}%`, sub: `${data.completed_weeks}/${data.total_weeks} weeks` },
          { label: 'Skills mastered', value: String(data.skills_mastered), sub: `${data.skills_in_progress} in progress` },
          {
            label: 'Interview score',
            value: data.interview_prep_score ? String(Math.round(data.interview_prep_score)) : '—',
            sub: data.latest_quiz_score ? `Last quiz: ${data.latest_quiz_score}%` : 'No quiz yet',
          },
        ].map((stat) => (
          <div key={stat.label}>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-neutral-600)', marginBottom: 4 }}>
              {stat.label}
            </div>
            <div style={{
              fontFamily: 'var(--font-heading)', fontSize: 'clamp(30px, 6vw, 40px)', lineHeight: 1,
              fontVariantNumeric: 'tabular-nums', color: stat.color || 'var(--color-accent)',
            }}>
              {stat.value}
            </div>
            <div className="text-muted" style={{ fontSize: 12, marginTop: 3 }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Main two-column body ── */}
      <div className="sf-split-dash">

        {/* ════ LEFT COLUMN ════ */}
        <div style={{ display: 'grid', gap: 32 }}>

          {/* Skill readiness breakdown */}
          <div>
            {/* Section header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, marginBottom: 6 }}>
                  Skill readiness breakdown
                </div>
                {/* Score + sparkbars */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontFamily: 'var(--font-heading)', fontSize: 36, lineHeight: 1,
                    color: scoreColor, fontVariantNumeric: 'tabular-nums',
                  }}>
                    {data.readiness_score}
                    <span style={{ fontSize: 20, color: 'var(--color-neutral-600)' }}>%</span>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2.5, height: 24 }}>
                    {sparkBars.map((pct, i) => (
                      <div key={i} style={{
                        width: 4.5, borderRadius: 2,
                        height: `${Math.max(20, pct)}%`,
                        background: pct > 60 ? 'var(--color-accent)' : pct > 30 ? '#d97706' : 'var(--color-divider)',
                      }} />
                    ))}
                  </div>
                </div>
              </div>
              {/* Legend */}
              <div style={{ display: 'grid', gap: 5, paddingTop: 4 }}>
                {[
                  { label: 'Your coverage', solid: true },
                  { label: 'Role requirement', solid: false },
                ].map((l) => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                    <span className="text-muted" style={{ fontSize: 11 }}>{l.label}</span>
                    {l.solid
                      ? <div style={{ width: 22, height: 2, borderRadius: 1, background: '#b68235' }} />
                      : <svg width="22" height="2"><line x1="0" y1="1" x2="22" y2="1" stroke="var(--color-divider)" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
                    }
                  </div>
                ))}
              </div>
            </div>

            {/* Area chart */}
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={195}>
                <AreaChart data={chartData} margin={{ top: 6, right: 4, left: -26, bottom: 0 }}>
                  <defs>
                    <linearGradient id="coverageGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#b68235" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#b68235" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--color-divider)" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: 'Lora, serif', fill: 'var(--color-neutral-600)' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fontFamily: 'Lora, serif', fill: 'var(--color-neutral-600)' }} axisLine={false} tickLine={false} ticks={[0, 25, 50, 75, 100]} />
                  <Tooltip
                    formatter={(val: number, name: string) => [`${val}%`, name === 'your' ? 'Your coverage' : 'Role requirement']}
                    contentStyle={{ fontFamily: 'Lora, serif', fontSize: 12, border: '1px solid var(--color-divider)', background: 'var(--color-bg)', borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                    cursor={{ stroke: 'var(--color-divider)', strokeWidth: 1 }}
                  />
                  <Area type="monotone" dataKey="target" stroke="var(--color-divider)" strokeWidth={1.5} strokeDasharray="5 4" fill="transparent" dot={false} activeDot={false} />
                  <Area type="monotone" dataKey="your" stroke="#b68235" strokeWidth={2.5} fill="url(#coverageGrad)"
                    dot={{ r: 3.5, fill: '#b68235', stroke: 'var(--color-bg)', strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: '#b68235', stroke: 'var(--color-bg)', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted" style={{ fontStyle: 'italic', fontSize: 13, padding: '32px 0', textAlign: 'center' }}>
                Complete gap analysis to see breakdown
              </div>
            )}
          </div>

          {/* Roadmap progress */}
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 10 }}>Roadmap progress</div>
            <div style={{ height: 6, borderRadius: 99, background: 'var(--color-divider)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                width: `${data.roadmap_progress}%`,
                background: 'linear-gradient(90deg, var(--color-accent-700), var(--color-accent))',
                transition: 'width 0.6s cubic-bezier(.4,0,.2,1)',
              }} />
            </div>
            <div className="text-muted" style={{ fontSize: 12, marginTop: 7 }}>
              {data.completed_weeks} of {data.total_weeks} weeks completed
            </div>
          </div>

          {/* Upcoming tasks */}
          {data.upcoming_tasks?.length > 0 && (
            <div>
              <div style={{
                fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'var(--color-accent)', fontWeight: 600, marginBottom: 12,
                paddingBottom: 8, borderBottom: '1px solid var(--color-divider)',
              }}>
                Upcoming tasks
              </div>
              <div style={{ display: 'grid', gap: 0 }}>
                {data.upcoming_tasks.map((t: any, i: number) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: i < data.upcoming_tasks.length - 1 ? '1px solid var(--color-divider)' : 'none',
                  }}>
                    <span style={{ fontSize: 13, lineHeight: 1.4 }}>{t.title}</span>
                    <span className="text-muted" style={{ fontSize: 12, flexShrink: 0, marginLeft: 16 }}>
                      {t.hours ? `${t.hours}h` : t.estimated_hours ? `${t.estimated_hours}h` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ════ RIGHT COLUMN ════ */}
        <div style={{ display: 'grid', gap: 20 }}>

          {/* Current week */}
          {data.current_week && (
            <div className="card" style={{ gap: 12 }}>
              <div className="card-kicker">Current week</div>
              <span className={`tag phase-${data.current_week.phase}`} style={{ alignSelf: 'flex-start', fontSize: 11 }}>
                {data.current_week.phase}
              </span>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 19, lineHeight: 1.3 }}>
                Week {data.current_week.number}: {data.current_week.title}
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => navigate(`/roadmap/week/${data.current_week!.id}`)}
                style={{ border: '1px solid var(--color-divider)', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
              >
                Continue <ArrowRight size={13} />
              </button>
            </div>
          )}

          {/* Critical gaps */}
          {data.critical_gaps?.length > 0 && (
            <div>
              <div style={{
                fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: '#dc2626', fontWeight: 600, marginBottom: 12,
              }}>
                Critical gaps
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {data.critical_gaps.slice(0, 4).map((g: any, i: number) => (
                  <div key={i} style={{ borderLeft: '2px solid #dc2626', paddingLeft: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{g.skill || g}</div>
                    {g.reason && (
                      <div className="text-muted" style={{ fontSize: 12, marginTop: 2, lineHeight: 1.5 }}>{g.reason}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick action buttons */}
          <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.path}
                onClick={() => navigate(a.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '13px 18px', width: '100%', textAlign: 'left',
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-divider)',
                  borderRadius: 8, cursor: 'pointer',
                  fontFamily: 'var(--font-heading)', fontSize: 16,
                  color: 'var(--color-text)',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--color-accent)'
                  e.currentTarget.style.background = 'color-mix(in srgb, var(--color-accent) 5%, var(--color-bg))'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--color-divider)'
                  e.currentTarget.style.background = 'var(--color-bg)'
                }}
              >
                <span style={{ color: 'var(--color-accent)', display: 'flex' }}>{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <Loader size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-accent)' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
