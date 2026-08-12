import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { quizApi } from '../lib/api'
import { Loader, Clock, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface QuizQuestion { n: number; text: string; options: string[]; correct: number; explanation: string }

const QUIZ_SECONDS = 600  // 10 minutes

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = (sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function Quiz() {
  const { weekId } = useParams<{ weekId: string }>()
  const [quiz, setQuiz] = useState<{ quiz_id: string; questions: QuizQuestion[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(QUIZ_SECONDS)
  const [expired, setExpired] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedRef = useRef(false)

  const fetchQuiz = () => {
    if (!weekId) return
    setLoading(true)
    setError(null)
    quizApi.getOrCreate(weekId)
      .then((r) => {
        const qs: QuizQuestion[] = r.data.data.questions
        setQuiz({ quiz_id: r.data.data.quiz_id, questions: qs })
        setAnswers(new Array(qs.length).fill(-1))
        startedRef.current = false  // reset so timer restarts
      })
      .catch((e) => setError(e.message || 'Failed to load quiz'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchQuiz() }, [weekId])

  // Start timer once quiz loads
  useEffect(() => {
    if (!quiz || result || startedRef.current) return
    startedRef.current = true
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          setExpired(true)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [quiz, result])

  // Auto-submit on expiry
  useEffect(() => {
    if (expired && quiz && !result) {
      handleSubmit(true)
    }
  }, [expired])

  const handleSubmit = async (force = false) => {
    if (!quiz) return
    if (!force && answers.some((a) => a === -1)) {
      toast.error('Answer all questions first')
      return
    }
    if (timerRef.current) clearInterval(timerRef.current)
    setSubmitting(true)
    try {
      const finalAnswers = answers.map((a) => a === -1 ? 0 : a)
      const r = await quizApi.submit(quiz.quiz_id, finalAnswers)
      setResult(r.data.data)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const timerWarning = timeLeft < 120 && !result

  if (loading) {
    return (
      <div style={styles.center}>
        <Loader size={22} style={{ animation: 'spin 1s linear infinite', color: '#b68235' }} />
        <span style={{ fontSize: 14, color: '#888', marginLeft: 10 }}>Loading quiz…</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.inner, textAlign: 'center', paddingTop: 80 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, marginBottom: 8 }}>
            Could not load quiz
          </div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 28, lineHeight: 1.6, maxWidth: '46ch', margin: '0 auto 28px' }}>
            {error}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={fetchQuiz} style={styles.btn}>Retry</button>
            <button onClick={() => window.close()} style={{ ...styles.btn, background: 'transparent', color: '#888', border: '1px solid #ddd' }}>
              Close tab
            </button>
          </div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div style={styles.center}>
        <p style={{ color: '#888', fontStyle: 'italic' }}>Quiz not available.</p>
      </div>
    )
  }

  if (result) {
    return (
      <div style={styles.page}>
        <div style={styles.inner}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 64, lineHeight: 1,
              color: result.passed ? '#b68235' : '#dc2626',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {result.score}%
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, marginTop: 6 }}>
              {result.verdict}
            </div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>
              {result.passed ? 'Skill marked as acquired. Gap scores updated.' : 'Review the material and try again.'}
            </div>
          </div>

          <div style={styles.card}>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#b68235', marginBottom: 14, fontWeight: 600 }}>
              Question breakdown
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {(result.feedback as any[]).map((fb: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ flexShrink: 0, marginTop: 1 }}>
                    {fb.is_correct
                      ? <CheckCircle size={15} color="#b68235" />
                      : <XCircle size={15} color="#dc2626" />
                    }
                  </span>
                  <div>
                    <div style={{ fontSize: 13, color: fb.is_correct ? '#b68235' : '#dc2626', fontWeight: 500 }}>
                      Q{i + 1}: {fb.is_correct ? 'Correct' : fb.correct_answer}
                    </div>
                    {!fb.is_correct && fb.explanation && (
                      <div style={{ fontSize: 12, color: '#888', fontStyle: 'italic', marginTop: 2, lineHeight: 1.5 }}>
                        {fb.explanation}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => window.close()}
            style={{ ...styles.btn, marginTop: 20, width: '100%' }}
          >
            Close tab
          </button>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  const answered = answers.filter((a) => a !== -1).length

  return (
    <div style={styles.page}>
      <div style={styles.inner}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#888', marginBottom: 4 }}>
              Checkpoint quiz
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26 }}>
              {quiz.questions.length} questions · ≥60% to pass
            </div>
          </div>

          {/* Timer */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontVariantNumeric: 'tabular-nums', fontSize: 22,
            fontFamily: "'Cormorant Garamond', serif",
            color: timerWarning ? '#dc2626' : '#b68235',
            border: `1.5px solid ${timerWarning ? '#dc2626' : '#b68235'}`,
            borderRadius: 8, padding: '6px 14px',
            animation: timerWarning ? 'pulse 1s ease-in-out infinite' : 'none',
          }}>
            <Clock size={16} style={{ color: timerWarning ? '#dc2626' : '#b68235' }} />
            {formatTime(timeLeft)}
          </div>
        </div>

        {expired && (
          <div style={{
            background: 'rgba(220,38,38,0.08)', border: '1px solid #dc2626',
            borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#dc2626',
          }}>
            Time's up — submitting with your current answers.
          </div>
        )}

        {/* Progress */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ height: 3, borderRadius: 99, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              width: `${(answered / quiz.questions.length) * 100}%`,
              background: 'linear-gradient(90deg, #8a5f24, #b68235)',
              transition: 'width 0.3s',
            }} />
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 5 }}>
            {answered} of {quiz.questions.length} answered
          </div>
        </div>

        {/* Questions */}
        <div style={{ display: 'grid', gap: 28 }}>
          {quiz.questions.map((q, qi) => (
            <div key={qi} style={styles.card}>
              <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>
                <span style={{ color: '#b68235', fontWeight: 600, marginRight: 6 }}>{qi + 1}.</span>
                {q.text}
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {q.options.map((opt, oi) => {
                  const selected = answers[qi] === oi
                  return (
                    <button
                      key={oi}
                      onClick={() => setAnswers((a) => { const n = [...a]; n[qi] = oi; return n })}
                      style={{
                        textAlign: 'left', padding: '10px 14px',
                        border: `1.5px solid ${selected ? '#b68235' : 'rgba(0,0,0,0.12)'}`,
                        borderRadius: 8,
                        background: selected ? 'rgba(182,130,53,0.08)' : 'transparent',
                        cursor: 'pointer', fontSize: 13,
                        color: selected ? '#8a5f24' : 'inherit',
                        transition: 'all 0.12s',
                        fontFamily: "'Lora', serif",
                      }}
                    >
                      <span style={{ color: selected ? '#b68235' : '#888', marginRight: 8, fontWeight: 600 }}>
                        {String.fromCharCode(65 + oi)}.
                      </span>
                      {opt}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Submit */}
        <button
          onClick={() => handleSubmit(false)}
          disabled={answers.some((a) => a === -1) || submitting}
          style={{
            ...styles.btn,
            width: '100%', marginTop: 28,
            opacity: answers.some((a) => a === -1) || submitting ? 0.5 : 1,
          }}
        >
          {submitting ? 'Scoring…' : `Submit quiz (${answered}/${quiz.questions.length} answered)`}
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Lora', serif; }
      `}</style>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#faf9f7',
    padding: '40px 16px 64px',
  } as React.CSSProperties,
  inner: {
    maxWidth: 640,
    margin: '0 auto',
  } as React.CSSProperties,
  card: {
    background: '#fff',
    border: '1px solid rgba(0,0,0,0.09)',
    borderRadius: 10,
    padding: '20px 22px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
  } as React.CSSProperties,
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: 10,
  } as React.CSSProperties,
  btn: {
    background: '#b68235',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '13px 24px',
    cursor: 'pointer',
    fontSize: 14,
    fontFamily: "'Cormorant Garamond', serif",
    letterSpacing: '0.04em',
  } as React.CSSProperties,
}
