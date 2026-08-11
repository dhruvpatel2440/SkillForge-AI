import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardApi } from '../lib/api'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Bar, BarChart, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { Loader, ArrowRight, BookOpen, Target, TrendingUp } from 'lucide-react'
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
      <div style={{ maxWidth: 640, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 34, marginBottom: 16 }}>Welcome to SkillForge AI</h2>
        <p className="text-muted" style={{ fontSize: 14, marginBottom: 32 }}>
          Set your career preferences and upload your resume to get started.
        </p>
        <div style={{ display: 'grid', gap: 12 }}>
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

  const scoreBreakdownData = Object.entries(data.score_breakdown || {}).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value: Number(value),
  }))

  const radarData = scoreBreakdownData.map((d) => ({ subject: d.name, score: d.value, fullMark: 35 }))

  const scoreColor = data.readiness_score >= 70 ? '#b68235' : data.readiness_score >= 40 ? '#d97706' : '#dc2626'

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '48px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <div className="card-kicker">{data.target_role}</div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 34, marginTop: 4 }}>Dashboard</h2>
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40 }}>
        {[
          { label: 'Readiness score', value: `${data.readiness_score}`, sub: 'out of 100', color: scoreColor },
          { label: 'Roadmap progress', value: `${data.roadmap_progress}%`, sub: `${data.completed_weeks}/${data.total_weeks} weeks` },
          { label: 'Skills mastered', value: String(data.skills_mastered), sub: `${data.skills_in_progress} in progress` },
          { label: 'Interview score', value: data.interview_prep_score ? `${Math.round(data.interview_prep_score)}` : '—', sub: data.latest_quiz_score ? `Last quiz: ${data.latest_quiz_score}%` : 'No quiz yet' },
        ].map((stat) => (
          <div key={stat.label} style={{ borderLeft: '1px solid var(--color-divider)', paddingLeft: 12 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-neutral-600)' }}>{stat.label}</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 38, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', color: stat.color || 'var(--color-accent)' }}>
              {stat.value}
            </div>
            <div className="text-muted" style={{ fontSize: 12 }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 48, alignItems: 'start' }}>
        {/* Left: charts */}
        <div>
          <h4 style={{ fontSize: 17, marginBottom: 16 }}>Skill readiness breakdown</h4>
          {scoreBreakdownData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={scoreBreakdownData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: 'Lora, serif', fill: '#7d7979' }} />
                <YAxis tick={{ fontSize: 10, fontFamily: 'Lora, serif', fill: '#7d7979' }} />
                <Tooltip
                  contentStyle={{ fontFamily: 'Lora, serif', fontSize: 12, border: '1px solid #d4d1cf', background: '#f3f2f2' }}
                />
                <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                  {scoreBreakdownData.map((_, i) => (
                    <Cell key={i} fill="#b68235" fillOpacity={0.7 + i * 0.05} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-muted" style={{ fontStyle: 'italic', fontSize: 13 }}>Complete gap analysis to see breakdown</div>
          )}

          {/* Roadmap progress */}
          <h4 style={{ fontSize: 17, margin: '32px 0 12px' }}>Roadmap progress</h4>
          <div className="progress-bar" style={{ height: 8 }}>
            <div className="progress-bar-fill" style={{ width: `${data.roadmap_progress}%` }} />
          </div>
          <div className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>
            {data.completed_weeks} of {data.total_weeks} weeks completed
          </div>
        </div>

        {/* Right: current week & actions */}
        <div style={{ display: 'grid', gap: 16 }}>
          {data.current_week && (
            <div className="card">
              <div className="card-kicker">Current week</div>
              <div className={`tag phase-${data.current_week.phase}`} style={{ alignSelf: 'flex-start' }}>{data.current_week.phase}</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20 }}>Week {data.current_week.number}: {data.current_week.title}</div>
              <button className="btn btn-primary" onClick={() => navigate(`/roadmap/week/${data.current_week!.id}`)}>
                Continue <ArrowRight size={14} />
              </button>
            </div>
          )}

          {data.critical_gaps?.length > 0 && (
            <div className="card">
              <div className="card-kicker" style={{ color: '#dc2626' }}>Critical gaps</div>
              {data.critical_gaps.map((g: any, i: number) => (
                <div key={i} style={{ fontSize: 13, borderLeft: '2px solid #dc2626', paddingLeft: 8 }}>
                  <strong>{g.skill || g}</strong>
                  {g.reason && <div className="text-muted" style={{ fontSize: 12 }}>{g.reason}</div>}
                </div>
              ))}
            </div>
          )}

          {data.upcoming_tasks?.length > 0 && (
            <div className="card">
              <div className="card-kicker">Upcoming tasks</div>
              {data.upcoming_tasks.map((t: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: i < data.upcoming_tasks.length - 1 ? '1px solid var(--color-divider)' : 'none' }}>
                  <span>{t.title}</span>
                  <span className="text-muted">{t.hours}h</span>
                </div>
              ))}
            </div>
          )}

          {/* Quick links */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => navigate('/roadmap')}>
              <BookOpen size={13} /> Roadmap
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/interview')}>
              <Target size={13} /> Interview
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/gap-analysis')}>
              <TrendingUp size={13} /> Gap analysis
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/upload')}>
              Update resume
            </button>
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
