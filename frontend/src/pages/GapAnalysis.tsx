import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { gapApi, roadmapApi } from '../lib/api'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Legend,
} from 'recharts'
import { Loader } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Types ──────────────────────────────────────────────────────────────
interface Strength { skill: string; level: string; evidence: string; demand_in_role: number }
interface WeakSkill { skill: string; issue: string; recommendation: string }
interface MissingSkill {
  skill: string; current_level: string; target_level: string
  gap_size: number; priority: string; reason: string
  demand_frequency: number; recommended_action: string
}
interface ProjectGap { skill: string; suggested_project: string }
interface GapData {
  target_role: string
  readiness_score: number
  score_breakdown: Record<string, number>
  strengths: Strength[]
  weak_skills: WeakSkill[]
  missing_skills: MissingSkill[]
  project_gaps: ProjectGap[]
  experience_gaps: string[]
  honest_assessment: string
  recommendations: string[]
}

// ── Score-breakdown max values (from prompt definition) ───────────────
const BREAKDOWN_MAX: Record<string, number> = {
  technical_skills: 35,
  projects_evidence: 25,
  experience: 15,
  role_requirements: 15,
  certifications_achievements: 10,
}
const BREAKDOWN_LABELS: Record<string, string> = {
  technical_skills: 'Technical',
  projects_evidence: 'Projects',
  experience: 'Experience',
  role_requirements: 'Role Fit',
  certifications_achievements: 'Certs',
}

// ── Sub-components ─────────────────────────────────────────────────────
function SkillBar({ fill, pct, color }: { fill: number; pct?: number; color: string }) {
  return (
    <div style={{ position: 'relative', height: 6, background: 'var(--color-neutral-200)', borderRadius: 3, flex: 1 }}>
      {pct !== undefined && (
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%',
          width: `${Math.min(100, pct)}%`, background: 'var(--color-neutral-300)', borderRadius: 3,
        }} />
      )}
      <div style={{
        position: 'absolute', left: 0, top: 0, height: '100%',
        width: `${Math.min(100, fill)}%`, background: color, borderRadius: 3,
      }} />
    </div>
  )
}

function SkillRow({ name, fillPct, bgPct, note, score, barColor }:
  { name: string; fillPct: number; bgPct?: number; note: string; score: number; barColor: string }) {
  return (
    <div className="sf-skill-row">
      <span className="sf-skill-name">{name}</span>
      <div className="sf-skill-bar">
        <SkillBar fill={fillPct} pct={bgPct} color={barColor} />
      </div>
      <span className="sf-skill-note text-muted">{note}</span>
      <span className="sf-skill-score" style={{ color: barColor }}>
        {score.toFixed(2)}
      </span>
    </div>
  )
}

function SectionHeader({ label, count, sub, color }: { label: string; count: number; sub: string; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
      <span style={{ fontFamily: 'var(--font-heading)', fontSize: 18, color }}>
        {label} <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-neutral-600)', fontWeight: 400 }}>{count} skills</span>
      </span>
      <span className="text-muted" style={{ fontSize: 11, fontStyle: 'italic' }}>{sub}</span>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────
export default function GapAnalysis() {
  const [gap, setGap] = useState<GapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    gapApi.get()
      .then((r) => { if (r.data.data) setGap(r.data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleBuildRoadmap = async () => {
    setGenerating(true)
    try {
      await roadmapApi.generate()
      toast.success('Roadmap ready!')
      navigate('/roadmap')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const r = await gapApi.generate()
      if (r.data.data) setGap(r.data.data)
      toast.success('Gap analysis refreshed')
    } catch (e: any) {
      toast.error('Regeneration failed')
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) return <Spinner />

  if (!gap) return (
    <div style={{ maxWidth: 720, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
      <p className="text-muted" style={{ fontStyle: 'italic' }}>
        No gap analysis found. Upload a resume and complete your onboarding first.
      </p>
    </div>
  )

  // ── Radar data ────────────────────────────────────────────────────
  const radarData = Object.entries(gap.score_breakdown || {}).map(([key, val]) => {
    const max = BREAKDOWN_MAX[key] ?? 10
    const userPct = Math.round((val / max) * 100)
    return {
      subject: BREAKDOWN_LABELS[key] || key,
      user: userPct,
      required: 100,
    }
  })

  // ── Skill sections ────────────────────────────────────────────────
  const critical = (gap.missing_skills || []).filter(s => s.priority === 'critical' || s.priority === 'high').slice(0, 6)
  const weak = (gap.weak_skills || []).slice(0, 6)
  const strong = (gap.strengths || []).slice(0, 6)

  const totalRequired = (gap.missing_skills || []).length + (gap.weak_skills || []).length + (gap.strengths || []).length
  const scoreColor = gap.readiness_score >= 70 ? '#b68235' : gap.readiness_score >= 40 ? '#d97706' : '#dc2626'

  return (
    <div className="sf-page">

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24, marginBottom: 32 }}>
        <div style={{ flex: '1 1 260px' }}>
          <h2 className="sf-h2" style={{ marginBottom: 6 }}>Gap analysis</h2>
          <p className="text-muted" style={{ fontSize: 13, maxWidth: '72ch', lineHeight: 1.6 }}>
            {gap.target_role} · {totalRequired} required skills diffed against role postings.{' '}
            <span style={{ fontStyle: 'italic' }}>
              gap_score = demand_frequency × (1 − proficiency) × recency × prerequisite_readiness
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button className="btn btn-primary" onClick={handleBuildRoadmap} disabled={generating || regenerating}
            style={{ minWidth: 170 }}>
            {generating ? 'Building…' : 'Build my roadmap →'}
          </button>
          <button className="btn btn-secondary" onClick={handleRegenerate} disabled={regenerating || generating}
            style={{ border: '1px solid var(--color-divider)', minWidth: 170, fontSize: 12 }}>
            {regenerating ? 'Re-analysing…' : '↻ Re-analyse resume'}
          </button>
          <div style={{ fontSize: 11, color: 'var(--color-neutral-600)', textAlign: 'right' }}>
            Readiness <span style={{ fontFamily: 'var(--font-heading)', fontSize: 20, color: scoreColor, fontVariantNumeric: 'tabular-nums' }}>{gap.readiness_score}</span>
            <span style={{ color: 'var(--color-neutral-600)' }}>/100</span>
          </div>
        </div>
      </div>

      <hr className="hr" style={{ marginBottom: 32 }} />

      {/* ── Two-column body ── */}
      <div className="sf-split-side">

        {/* LEFT: Radar chart */}
        <div>
          {radarData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <PolarGrid stroke="var(--color-divider)" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fontSize: 12, fontFamily: 'var(--font-body)', fill: 'var(--color-neutral-600)' }}
                  />
                  <Radar
                    name="Role requirement"
                    dataKey="required"
                    stroke="#d4d1cf"
                    strokeWidth={1.5}
                    strokeDasharray="5 4"
                    fill="transparent"
                  />
                  <Radar
                    name="Your coverage"
                    dataKey="user"
                    stroke="#b68235"
                    strokeWidth={2}
                    fill="#b68235"
                    fillOpacity={0.15}
                  />
                </RadarChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <div style={{ width: 24, height: 2, background: '#b68235' }} />
                  <span className="text-muted">Your coverage</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <svg width="24" height="2">
                    <line x1="0" y1="1" x2="24" y2="1" stroke="#9e9e9e" strokeWidth="1.5" strokeDasharray="5 4" />
                  </svg>
                  <span className="text-muted">Role requirement</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-muted" style={{ fontStyle: 'italic', fontSize: 13 }}>No score breakdown available.</div>
          )}
        </div>

        {/* RIGHT: Skill sections */}
        <div style={{ display: 'grid', gap: 36 }}>

          {/* Critical gaps */}
          {critical.length > 0 && (
            <div>
              <SectionHeader label="Critical gaps" count={critical.length} sub="market wants it · you have nothing" color="#dc2626" />
              <div style={{ borderTop: '1px solid var(--color-divider)' }}>
                {critical.map((s, i) => (
                  <SkillRow
                    key={i}
                    name={s.skill}
                    fillPct={(s.demand_frequency ?? 0) * 100}
                    note={s.reason?.slice(0, 28) || s.recommended_action?.slice(0, 28) || 'no evidence at all'}
                    score={s.demand_frequency ?? s.gap_size / 100}
                    barColor="#b68235"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Weak evidence */}
          {weak.length > 0 && (
            <div>
              <SectionHeader label="Weak evidence" count={weak.length} sub="listed in Skills · no project backs it" color="#d97706" />
              <div style={{ borderTop: '1px solid var(--color-divider)' }}>
                {weak.map((s, i) => (
                  <SkillRow
                    key={i}
                    name={s.skill}
                    fillPct={60}
                    note={s.issue?.slice(0, 28) || 'listed, no project'}
                    score={0.6}
                    barColor="#9e9e9e"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Strong */}
          {strong.length > 0 && (
            <div>
              <SectionHeader label="Strong" count={strong.length} sub="you have it · market wants it" color="#b68235" />
              <div style={{ borderTop: '1px solid var(--color-divider)' }}>
                {strong.map((s, i) => (
                  <SkillRow
                    key={i}
                    name={s.skill}
                    fillPct={(s.demand_in_role ?? 0.7) * 100}
                    note={`proficiency ${typeof s.level === 'string' && s.level.length <= 12 ? s.level : (s.demand_in_role ?? 0.7).toFixed(2)}`}
                    score={s.demand_in_role ?? 0.7}
                    barColor="#b68235"
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Honest Assessment ── */}
      {gap.honest_assessment && (
        <div style={{
          marginTop: 40,
          padding: '18px 22px',
          border: '1px solid var(--color-divider)',
          borderLeft: '3px solid var(--color-accent)',
          borderRadius: 6,
          background: 'color-mix(in srgb, var(--color-accent) 5%, var(--color-bg))',
        }}>
          <div className="card-kicker" style={{ marginBottom: 8 }}>Honest assessment</div>
          <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0, color: 'var(--color-text)' }}>
            {gap.honest_assessment}
          </p>
        </div>
      )}

      {/* ── Project Gaps ── */}
      {gap.project_gaps?.length > 0 && (
        <div style={{ marginTop: 36 }}>
          <hr className="hr" style={{ marginBottom: 24 }} />
          <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, marginBottom: 4 }}>Projects to build</h4>
          <p className="text-muted" style={{ fontSize: 12, marginBottom: 16 }}>
            Skills that need project evidence — build these to prove your capability
          </p>
          <div style={{ display: 'grid', gap: 12 }}>
            {gap.project_gaps.map((pg, i) => (
              <div key={i} className="sf-row-label" style={{
                padding: '12px 16px', border: '1px solid var(--color-divider)', borderRadius: 6,
              }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 15, color: 'var(--color-accent)' }}>
                  {pg.skill}
                </span>
                <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text)' }}>
                  {pg.suggested_project}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recommendations ── */}
      {gap.recommendations?.length > 0 && (
        <div style={{ marginTop: 36 }}>
          <hr className="hr" style={{ marginBottom: 24 }} />
          <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, marginBottom: 16 }}>Recommendations</h4>
          <ol style={{ paddingLeft: 20, display: 'grid', gap: 10 }}>
            {gap.recommendations.map((r, i) => (
              <li key={i} style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--color-text)' }}>{r}</li>
            ))}
          </ol>
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
