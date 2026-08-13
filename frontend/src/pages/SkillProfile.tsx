import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { skillsApi, gapApi } from '../lib/api'
import { Loader } from 'lucide-react'
import toast from 'react-hot-toast'

interface Skill {
  id: string
  name: string
  category: string
  proficiency: string
  confidence: number
  evidence: string
  evidence_source: string
  evidence_strength: string
}

const STRENGTH_COLORS: Record<string, string> = {
  strong: 'var(--color-accent-700)',
  moderate: '#2563eb',
  weak: '#6b7280',
}

export default function SkillProfile() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    skillsApi.getSkills()
      .then((r) => setSkills(r.data.data || []))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleConfirm = async () => {
    setGenerating(true)
    try {
      await gapApi.generate()
      navigate('/gap-analysis')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const strengthLabel = (s: string) => ({ strong: 'Strong evidence', moderate: 'Moderate', weak: 'Weak evidence' }[s] || s)
  const tagCls = (s: string) => s === 'strong' ? 'tag tag-accent' : s === 'moderate' ? 'tag tag-neutral' : 'tag tag-outline'

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-accent)' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const strong = skills.filter((s) => s.evidence_strength === 'strong').length
  const total = skills.length

  return (
    <div className="sf-page" style={{ maxWidth: 1080 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 34, marginBottom: 6 }}>Skill profile</h2>
          <p className="text-muted" style={{ fontSize: 14, maxWidth: '62ch' }}>
            {total} skills extracted · {strong} with strong evidence · {total - strong} need backing
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleConfirm} disabled={generating || total === 0}>
          {generating ? 'Generating analysis…' : 'Confirm & run gap analysis →'}
        </button>
      </div>

      <hr className="hr" />

      {total === 0 ? (
        <div className="text-muted" style={{ textAlign: 'center', padding: '48px 0', fontStyle: 'italic' }}>
          No skills extracted yet. Upload and process your resume first.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 12 }}>
          {skills.map((s) => (
            <div key={s.id} className="card animate-rise">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 19 }}>{s.name}</span>
                <span className={tagCls(s.evidence_strength)} style={{ marginLeft: 'auto' }}>
                  {strengthLabel(s.evidence_strength)}
                </span>
              </div>

              {s.evidence && (
                <div style={{
                  borderLeft: '2px solid var(--color-accent)',
                  paddingLeft: 12,
                  fontStyle: 'italic',
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: 'color-mix(in srgb, var(--color-text) 78%, transparent)',
                }}>
                  "{s.evidence}"
                </div>
              )}

              <div className="card-meta" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>
                  {s.evidence_source || 'Resume'} · {s.proficiency}
                </span>
                <span style={{ fontSize: 11, color: STRENGTH_COLORS[s.evidence_strength] }}>
                  {Math.round((s.confidence || 0.5) * 100)}% confidence
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
