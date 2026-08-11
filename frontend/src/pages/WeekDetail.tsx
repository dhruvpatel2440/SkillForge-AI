import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { roadmapApi, quizApi } from '../lib/api'
import { CheckSquare, Square, ExternalLink, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

interface Task { id: string; title: string; description: string; task_type: string; estimated_hours: number; completed: boolean }
interface Resource { id: string; title: string; provider: string; url: string; resource_type: string; difficulty: string; estimated_hours: number; reason: string }
interface QuizQuestion { n: number; text: string; options: string[]; correct: number; explanation: string }

const PHASE_COLORS: Record<string, string> = { foundation: '#2563eb', intermediate: 'var(--color-accent-700)', advanced: '#7c3aed' }

export default function WeekDetail() {
  const { weekId } = useParams<{ weekId: string }>()
  const navigate = useNavigate()
  const [week, setWeek] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [quiz, setQuiz] = useState<{ quiz_id: string; questions: QuizQuestion[] } | null>(null)
  const [quizLoading, setQuizLoading] = useState(false)
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [linkValue, setLinkValue] = useState('')
  const [linkDone, setLinkDone] = useState(false)

  useEffect(() => {
    if (!weekId) return
    roadmapApi.getWeek(weekId)
      .then((r) => {
        setWeek(r.data.data)
        setAnswers(new Array((r.data.data?.tasks || []).length).fill(-1))
      })
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

  const loadQuiz = async () => {
    if (!weekId) return
    setQuizLoading(true)
    try {
      const r = await quizApi.getOrCreate(weekId)
      const qs: QuizQuestion[] = r.data.data.questions
      setQuiz({ quiz_id: r.data.data.quiz_id, questions: qs })
      setAnswers(new Array(qs.length).fill(-1))
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setQuizLoading(false)
    }
  }

  const submitQuiz = async () => {
    if (!quiz) return
    if (answers.some((a) => a === -1)) { toast.error('Answer all questions first'); return }
    setSubmitting(true)
    try {
      const r = await quizApi.submit(quiz.quiz_id, answers)
      setResult(r.data.data)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Spinner />
  if (!week) return <div style={{ padding: 48, textAlign: 'center' }} className="text-muted">Week not found.</div>

  const tasks: Task[] = week.tasks || []
  const resources: Resource[] = week.resources || []
  const checklist: string[] = week.checklist || []
  const completedTasks = tasks.filter((t) => t.completed).length
  const pct = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '24px 24px 48px' }}>
      <button className="btn btn-ghost" onClick={() => navigate('/roadmap')} style={{ marginBottom: 12 }}>
        ← Roadmap
      </button>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span className="text-muted" style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', fontVariantNumeric: 'tabular-nums' }}>
          Week {week.week_number}
        </span>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 36 }}>{week.title}</h2>
        <span className={`tag phase-${week.phase}`} style={{ marginLeft: 8 }}>{week.phase}</span>
      </div>

      <p style={{ fontSize: 15, lineHeight: 1.7, maxWidth: '74ch', marginTop: 12 }}>{week.objective}</p>

      <hr className="hr" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'start' }}>
        {/* Left column */}
        <div>
          {/* Resources */}
          <h4 style={{ fontSize: 17, marginBottom: 8 }}>Learning resources</h4>
          {resources.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 13, fontStyle: 'italic' }}>Loading resources…</p>
          ) : (
            <div style={{ borderTop: '1px solid var(--color-divider)' }}>
              {resources.map((r) => (
                <div key={r.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-divider)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-heading)', fontSize: 15, color: 'var(--color-accent-700)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {r.title} <ExternalLink size={12} />
                    </a>
                    <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                      {r.provider} · {r.difficulty} · {r.estimated_hours}h
                    </div>
                    {r.reason && <div className="text-muted" style={{ fontSize: 12, fontStyle: 'italic', marginTop: 4 }}>{r.reason}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tasks */}
          <h4 style={{ fontSize: 17, margin: '24px 0 8px' }}>Tasks</h4>
          <div style={{ display: 'grid', gap: 6 }}>
            {tasks.map((t) => (
              <div
                key={t.id}
                onClick={() => toggleTask(t.id, t.completed)}
                style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', padding: '8px 0' }}
              >
                {t.completed ? (
                  <CheckSquare size={16} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 1 }} />
                ) : (
                  <Square size={16} style={{ color: 'var(--color-neutral-600)', flexShrink: 0, marginTop: 1 }} />
                )}
                <div>
                  <div style={{ fontSize: 14, textDecoration: t.completed ? 'line-through' : 'none', color: t.completed ? 'var(--color-neutral-600)' : 'var(--color-text)' }}>
                    {t.title}
                  </div>
                  {t.description && <div className="text-muted" style={{ fontSize: 12 }}>{t.description}</div>}
                </div>
                <span className="text-muted" style={{ marginLeft: 'auto', fontSize: 11, flexShrink: 0 }}>{t.estimated_hours}h</span>
              </div>
            ))}
          </div>

          {tasks.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>{completedTasks}/{tasks.length} completed</div>
            </div>
          )}

          {/* Checklist */}
          {checklist.length > 0 && (
            <>
              <h4 style={{ fontSize: 17, margin: '24px 0 8px' }}>Completion checklist</h4>
              <div style={{ display: 'grid', gap: 4 }}>
                {checklist.map((item, i) => (
                  <div key={i} className="text-muted" style={{ fontSize: 13, paddingLeft: 4 }}>□ {item}</div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right column — Quiz */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <h4 style={{ fontSize: 17 }}>Checkpoint quiz</h4>
            <span className="text-muted" style={{ fontSize: 11 }}>5 questions · ≥60% to pass</span>
          </div>
          <p className="text-muted" style={{ fontSize: 12, fontStyle: 'italic', marginBottom: 12 }}>
            ≥80% marks the skill acquired and re-scores every gap. Below 50% inserts reinforcement.
          </p>

          {!quiz && !result && (
            <button className="btn btn-secondary btn-block" onClick={loadQuiz} disabled={quizLoading}>
              {quizLoading ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading quiz…</> : 'Load quiz'}
            </button>
          )}

          {quiz && !result && (
            <div style={{ display: 'grid', gap: 16 }}>
              {quiz.questions.map((q, qi) => (
                <div key={qi}>
                  <div style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 8 }}>
                    <span className="text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>{qi + 1}. </span>
                    {q.text}
                  </div>
                  <div style={{ display: 'grid', gap: 5 }}>
                    {q.options.map((opt, oi) => (
                      <button
                        key={oi}
                        onClick={() => setAnswers((a) => { const n = [...a]; n[qi] = oi; return n })}
                        style={{
                          textAlign: 'left',
                          padding: '8px 12px',
                          border: `1px solid ${answers[qi] === oi ? 'var(--color-accent)' : 'var(--color-divider)'}`,
                          borderRadius: 'var(--radius-md)',
                          background: answers[qi] === oi ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)' : 'transparent',
                          cursor: 'pointer',
                          fontSize: 13,
                          color: answers[qi] === oi ? 'var(--color-accent-700)' : 'var(--color-text)',
                          transition: 'all 0.1s',
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <button
                className="btn btn-primary btn-block"
                onClick={submitQuiz}
                disabled={answers.some((a) => a === -1) || submitting}
                style={{ marginTop: 8 }}
              >
                {submitting ? 'Scoring…' : 'Submit quiz'}
              </button>
            </div>
          )}

          {result && (
            <div className="card animate-rise" style={{ borderColor: result.passed ? 'var(--color-accent)' : 'var(--color-divider)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 40, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: 'var(--color-accent)' }}>
                  {result.score}%
                </span>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 19 }}>{result.verdict}</span>
              </div>
              <hr className="hr" style={{ margin: '12px 0' }} />
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-accent-700)', marginBottom: 6 }}>
                Question breakdown
              </div>
              {(result.feedback as any[]).map((fb: any, i: number) => (
                <div key={i} style={{ fontSize: 12, lineHeight: 1.5, padding: '4px 0', color: fb.is_correct ? 'var(--color-accent-700)' : '#dc2626' }}>
                  {fb.is_correct ? '✓' : '✗'} Q{i + 1}: {fb.is_correct ? 'Correct' : fb.correct_answer}
                  {!fb.is_correct && fb.explanation && (
                    <div className="text-muted" style={{ fontSize: 11, fontStyle: 'italic' }}>{fb.explanation}</div>
                  )}
                </div>
              ))}
              <button className="btn btn-primary btn-block" onClick={() => navigate('/roadmap')} style={{ marginTop: 12 }}>
                See roadmap →
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
