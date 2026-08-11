import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { roadmapApi } from '../lib/api'
import { Loader } from 'lucide-react'
import toast from 'react-hot-toast'

interface Week {
  id: string
  week_number: number
  phase: string
  title: string
  objective: string
  skills: string[]
  estimated_hours: number
  status: string
  completion_percentage: number
}

const PHASE_LABELS: Record<string, string> = { foundation: 'Foundation', intermediate: 'Intermediate', advanced: 'Advanced' }

export default function Roadmap() {
  const [weeks, setWeeks] = useState<Week[]>([])
  const [roadmapId, setRoadmapId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      try {
        const cur = await roadmapApi.getCurrent()
        if (cur.data.data) {
          setRoadmapId(cur.data.data.id)
          const ws = await roadmapApi.getWeeks(cur.data.data.id)
          setWeeks(ws.data.data || [])
        }
      } catch (e: any) {
        toast.error(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await roadmapApi.generate()
      const cur = await roadmapApi.getCurrent()
      if (cur.data.data) {
        setRoadmapId(cur.data.data.id)
        const ws = await roadmapApi.getWeeks(cur.data.data.id)
        setWeeks(ws.data.data || [])
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const weekColor = (phase: string) => ({ foundation: '#2563eb', intermediate: 'var(--color-accent)', advanced: '#7c3aed' }[phase] || 'var(--color-text)')
  const statusCta = (w: Week) => w.status === 'completed' ? 'Review' : w.status === 'in_progress' ? 'Continue →' : 'Start →'
  const phaseCls = (phase: string) => `tag phase-${phase}`

  if (loading) return <Spinner />

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 34, marginBottom: 6 }}>Your roadmap</h2>
          <p className="text-muted" style={{ fontSize: 14 }}>
            {weeks.length > 0
              ? `${weeks.length} weeks · ordered by gap_size × market_demand × prerequisite readiness`
              : 'No roadmap yet'}
          </p>
        </div>
        {weeks.length === 0 && (
          <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating…' : 'Generate roadmap →'}
          </button>
        )}
      </div>

      <hr className="hr" />

      {weeks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p className="text-muted" style={{ fontStyle: 'italic', marginBottom: 24 }}>
            Complete the gap analysis first, then generate your roadmap here.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/gap-analysis')}>
            Go to Gap Analysis →
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 0 }}>
          {weeks.map((w) => (
            <div
              key={w.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                padding: '20px 0',
                borderBottom: '1px solid var(--color-divider)',
                opacity: w.status === 'completed' ? 0.7 : 1,
              }}
            >
              <div style={{ width: 74, flexShrink: 0, textAlign: 'center' }}>
                <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-neutral-600)' }}>Week</div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 30, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: weekColor(w.phase) }}>
                  {w.week_number}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: 20 }}>{w.title}</span>
                  <span className={phaseCls(w.phase)}>{PHASE_LABELS[w.phase] || w.phase}</span>
                  {w.status === 'completed' && <span className="tag tag-accent">✓ Done</span>}
                </div>
                <p className="text-muted" style={{ fontSize: 13, lineHeight: 1.55, maxWidth: '70ch' }}>{w.objective}</p>
                {w.completion_percentage > 0 && w.status !== 'completed' && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="progress-bar" style={{ width: 120 }}>
                      <div className="progress-bar-fill" style={{ width: `${w.completion_percentage}%` }} />
                    </div>
                    <span className="text-muted" style={{ fontSize: 11 }}>{Math.round(w.completion_percentage)}%</span>
                  </div>
                )}
                <div className="text-muted" style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
                  <span>{w.estimated_hours}h estimated</span>
                  {w.skills?.slice(0, 3).map((s) => <span key={s} className="tag tag-neutral">{s}</span>)}
                </div>
              </div>

              <button className="btn btn-secondary" onClick={() => navigate(`/roadmap/week/${w.id}`)} style={{ flexShrink: 0 }}>
                {statusCta(w)}
              </button>
            </div>
          ))}
        </div>
      )}
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
