import { useEffect, useState } from 'react'
import { interviewApi } from '../lib/api'
import { Loader, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

interface Question {
  id: string
  question: string
  category: string
  difficulty: string
  answer_guidance: string
}

interface Feedback {
  score: number
  strengths: string[]
  weaknesses: string[]
  missing_points: string[]
  better_answer_structure: string[]
  feedback: string
}

const CATEGORIES = ['all', 'technical', 'project', 'behavioral', 'scenario', 'resume']
const CATEGORY_LABELS: Record<string, string> = {
  all: 'All',
  technical: 'Technical',
  project: 'Projects',
  behavioral: 'Behavioral',
  scenario: 'Scenario',
  resume: 'Resume-based',
}

export default function Interview() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [answer, setAnswer] = useState('')
  const [feedbacks, setFeedbacks] = useState<Record<string, Feedback>>({})
  const [submitting, setSubmitting] = useState<string | null>(null)

  useEffect(() => {
    interviewApi.getQuestions()
      .then((r) => setQuestions(r.data.data || []))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? questions : questions.filter((q) => q.category === filter)

  const submitAnswer = async (questionId: string) => {
    if (!answer.trim()) { toast.error('Enter your answer first'); return }
    setSubmitting(questionId)
    try {
      const r = await interviewApi.answer(questionId, answer)
      setFeedbacks((f) => ({ ...f, [questionId]: r.data.data }))
      setAnswer('')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(null)
    }
  }

  const difficultyColor = (d: string) => ({ easy: '#16a34a', medium: '#d97706', hard: '#dc2626' }[d] || '#6b7280')
  const tagCls = (cat: string) => ({ technical: 'tag tag-accent', project: 'tag tag-neutral', behavioral: 'tag tag-outline', scenario: 'tag tag-neutral', resume: 'tag tag-accent' }[cat] || 'tag tag-outline')

  if (loading) return <Spinner />

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 34, marginBottom: 6 }}>Interview prep</h2>
      <p className="text-muted" style={{ fontSize: 14, maxWidth: '66ch' }}>
        Filtered to your profile: your claimed skills, closed gaps, and questions generated from your projects.
      </p>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            style={{
              padding: '6px 14px',
              border: `1px solid ${filter === cat ? 'var(--color-accent)' : 'var(--color-divider)'}`,
              borderRadius: 'var(--radius-md)',
              background: filter === cat ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)' : 'transparent',
              color: filter === cat ? 'var(--color-accent-700)' : 'var(--color-neutral-600)',
              cursor: 'pointer',
              fontSize: 13,
              transition: 'all 0.1s',
            }}
          >
            {CATEGORY_LABELS[cat]} {cat !== 'all' && `(${questions.filter(q => q.category === cat).length})`}
          </button>
        ))}
      </div>

      <hr className="hr" />

      {filtered.length === 0 ? (
        <p className="text-muted" style={{ fontStyle: 'italic', padding: '24px 0' }}>
          No questions in this category yet. Generate interview questions by processing your resume first.
        </p>
      ) : (
        <div style={{ borderTop: '1px solid var(--color-divider)' }}>
          {filtered.map((q) => (
            <div key={q.id} style={{ borderBottom: '1px solid var(--color-divider)' }}>
              <div
                style={{ padding: '16px 0', display: 'grid', gridTemplateColumns: '1fr 190px', gap: 16, alignItems: 'start', cursor: 'pointer' }}
                onClick={() => setExpanded(expanded === q.id ? null : q.id)}
              >
                <div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, lineHeight: 1.3 }}>{q.question}</div>
                  {q.answer_guidance && (
                    <p className="text-muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.6, fontStyle: 'italic' }}>{q.answer_guidance}</p>
                  )}
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <span className={tagCls(q.category)}>{CATEGORY_LABELS[q.category] || q.category}</span>
                  <span style={{ fontSize: 11, color: difficultyColor(q.difficulty) }}>{q.difficulty}</span>
                  {expanded === q.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>

              {expanded === q.id && (
                <div style={{ paddingBottom: 20, display: 'grid', gap: 12 }}>
                  {feedbacks[q.id] ? (
                    <div className="card animate-rise">
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 32, color: 'var(--color-accent)', fontVariantNumeric: 'tabular-nums' }}>
                          {feedbacks[q.id].score}
                        </span>
                        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16 }}>/100</span>
                      </div>
                      <p style={{ fontSize: 14, lineHeight: 1.65 }}>{feedbacks[q.id].feedback}</p>
                      {feedbacks[q.id].missing_points?.length > 0 && (
                        <div>
                          <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#d97706', marginBottom: 4 }}>Missing points</div>
                          {feedbacks[q.id].missing_points.map((p, i) => (
                            <div key={i} style={{ fontSize: 13, color: '#92400e' }}>· {p}</div>
                          ))}
                        </div>
                      )}
                      {feedbacks[q.id].better_answer_structure?.length > 0 && (
                        <div>
                          <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-accent-700)', marginBottom: 4 }}>How to improve</div>
                          {feedbacks[q.id].better_answer_structure.map((s, i) => (
                            <div key={i} style={{ fontSize: 13 }}>· {s}</div>
                          ))}
                        </div>
                      )}
                      <button className="btn btn-ghost" onClick={() => setFeedbacks((f) => { const n = {...f}; delete n[q.id]; return n })} style={{ alignSelf: 'flex-start', fontSize: 12 }}>
                        Try again
                      </button>
                    </div>
                  ) : (
                    <>
                      <textarea
                        className="input"
                        placeholder="Type your answer here…"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        rows={5}
                        style={{ resize: 'vertical' }}
                      />
                      <button
                        className="btn btn-primary"
                        onClick={() => submitAnswer(q.id)}
                        disabled={!answer.trim() || submitting === q.id}
                        style={{ alignSelf: 'flex-start' }}
                      >
                        {submitting === q.id ? 'Getting feedback…' : 'Get AI feedback →'}
                      </button>
                    </>
                  )}
                </div>
              )}
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
