import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { roadmapApi } from '../lib/api'
import { CheckSquare, Square, ExternalLink, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

interface Task { id: string; title: string; description: string; task_type: string; estimated_hours: number; completed: boolean }
interface Resource { id: string; title: string; provider: string; url: string; resource_type: string; difficulty: string; estimated_hours: number; reason: string }

const PHASE_COLORS: Record<string, string> = {
  foundation: '#2563eb',
  intermediate: 'var(--color-accent-700)',
  advanced: '#7c3aed',
}

export default function WeekDetail() {
  const { weekId } = useParams<{ weekId: string }>()
  const navigate = useNavigate()
  const [week, setWeek] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!weekId) return
    roadmapApi.getWeek(weekId)
      .then((r) => setWeek(r.data.data))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [weekId])

  const toggleTask = async (taskId: string, completed: boolean) => {
    try {
      await roadmapApi.updateTask(taskId, !completed)
      setWeek((w: any) => ({
        ...w,
        tasks: w.tasks.map((t: Task) => t.id === taskId ? { ...t, completed: !completed } : t),
      }))
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const openQuiz = () => {
    window.open(`/quiz/${weekId}`, '_blank', 'noopener,noreferrer')
  }

  if (loading) return <Spinner />
  if (!week) return <div style={{ padding: 48, textAlign: 'center' }} className="text-muted">Week not found.</div>

  const tasks: Task[] = week.tasks || []
  const resources: Resource[] = week.resources || []
  const checklist: string[] = week.checklist || []
  const completedTasks = tasks.filter((t) => t.completed).length
  const pct = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0
  const phaseColor = PHASE_COLORS[week.phase] || 'var(--color-accent)'

  return (
    <div className="sf-page" style={{ maxWidth: 980 }}>

      {/* Back */}
      <button
        className="btn btn-ghost"
        onClick={() => navigate('/roadmap')}
        style={{ marginBottom: 16, fontSize: 13, color: 'var(--color-neutral-600)' }}
      >
        ← Roadmap
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-neutral-600)', fontVariantNumeric: 'tabular-nums' }}>
          Week {week.week_number}
        </span>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 34, margin: 0, lineHeight: 1.15, flex: 1 }}>
          {week.title}
        </h2>
        <span style={{
          fontSize: 11, padding: '3px 10px', borderRadius: 20,
          background: `color-mix(in srgb, ${phaseColor} 12%, transparent)`,
          color: phaseColor, border: `1px solid color-mix(in srgb, ${phaseColor} 30%, transparent)`,
          flexShrink: 0, letterSpacing: '0.06em', fontWeight: 500,
        }}>
          {week.phase}
        </span>
      </div>

      {week.objective && (
        <p style={{ fontSize: 14, lineHeight: 1.7, maxWidth: '80ch', marginTop: 10, color: 'var(--color-neutral-600)' }}>
          {week.objective}
        </p>
      )}

      <hr style={{ border: 'none', borderTop: '1px solid var(--color-divider)', margin: '22px 0' }} />

      {/* Two-column body */}
      <div className="sf-split-even">

        {/* ── LEFT: Learning resources ── */}
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 17, marginBottom: 14 }}>Learning resources</div>
          {resources.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 13, fontStyle: 'italic' }}>No resources yet.</p>
          ) : (
            <div>
              {resources.map((r, i) => (
                <div key={r.id} style={{
                  paddingBottom: 14, marginBottom: 14,
                  borderBottom: i < resources.length - 1 ? '1px solid var(--color-divider)' : 'none',
                }}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: 'var(--font-heading)', fontSize: 15,
                      color: 'var(--color-accent-700)',
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      textDecoration: 'none',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                  >
                    {r.title} <ExternalLink size={11} style={{ flexShrink: 0 }} />
                  </a>
                  <div className="text-muted" style={{ fontSize: 11, marginTop: 3 }}>
                    {r.provider} · {r.difficulty} · {r.estimated_hours}h
                  </div>
                  {r.reason && (
                    <div className="text-muted" style={{ fontSize: 12, fontStyle: 'italic', marginTop: 5, lineHeight: 1.55 }}>
                      {r.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Tasks + Checklist + Quiz ── */}
        <div style={{ display: 'grid', gap: 28 }}>

          {/* Tasks */}
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 17, marginBottom: 14 }}>Tasks</div>
            <div>
              {tasks.map((t, i) => (
                <div
                  key={t.id}
                  onClick={() => toggleTask(t.id, t.completed)}
                  style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    cursor: 'pointer', padding: '10px 0',
                    borderBottom: i < tasks.length - 1 ? '1px solid var(--color-divider)' : 'none',
                  }}
                >
                  <span style={{ marginTop: 2, flexShrink: 0 }}>
                    {t.completed
                      ? <CheckSquare size={15} style={{ color: 'var(--color-accent)' }} />
                      : <Square size={15} style={{ color: 'var(--color-neutral-600)' }} />
                    }
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 500, lineHeight: 1.4,
                      textDecoration: t.completed ? 'line-through' : 'none',
                      color: t.completed ? 'var(--color-neutral-600)' : 'var(--color-text)',
                    }}>
                      {t.title}
                    </div>
                    {t.description && (
                      <div className="text-muted" style={{ fontSize: 12, marginTop: 2, lineHeight: 1.5 }}>
                        {t.description}
                      </div>
                    )}
                  </div>
                  <span className="text-muted" style={{ fontSize: 11, flexShrink: 0, marginTop: 2 }}>
                    {t.estimated_hours}h
                  </span>
                </div>
              ))}
            </div>

            {tasks.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ height: 4, borderRadius: 99, background: 'var(--color-divider)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 99, width: `${pct}%`,
                    background: 'linear-gradient(90deg, var(--color-accent-700), var(--color-accent))',
                    transition: 'width 0.4s',
                  }} />
                </div>
                <div className="text-muted" style={{ fontSize: 11, marginTop: 5 }}>
                  {completedTasks}/{tasks.length} completed
                </div>
              </div>
            )}
          </div>

          {/* Completion checklist */}
          {checklist.length > 0 && (
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 17, marginBottom: 10 }}>Completion checklist</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {checklist.map((item, i) => (
                  <div key={i} className="text-muted" style={{ fontSize: 13, display: 'flex', gap: 8, lineHeight: 1.5 }}>
                    <span style={{ flexShrink: 0 }}>□</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Checkpoint quiz */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 17 }}>Checkpoint quiz</div>
              <span className="text-muted" style={{ fontSize: 11 }}>5 questions · ≥60% to pass</span>
            </div>
            <p className="text-muted" style={{ fontSize: 12, fontStyle: 'italic', marginBottom: 14, lineHeight: 1.55 }}>
              ≥80% marks the skill acquired and re-scores every gap. Below 50% inserts reinforcement.
            </p>
            <button
              className="btn btn-secondary btn-block"
              onClick={openQuiz}
              style={{ border: '1px solid var(--color-divider)', width: '100%' }}
            >
              Load quiz ↗
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
