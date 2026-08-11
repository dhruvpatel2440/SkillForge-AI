import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { resumeApi } from '../lib/api'
import { Upload as UploadIcon, CheckCircle, Circle, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

const STAGES = [
  { key: 'uploaded', label: 'Resume uploaded' },
  { key: 'extracting', label: 'Text extracted' },
  { key: 'converted', label: 'Resume converted to Markdown' },
  { key: 'analyzing', label: 'Analyzing skills, gaps & building roadmap…' },
  { key: 'completed', label: 'Career profile + roadmap ready' },
]

const STATUS_ORDER = ['uploaded', 'extracting', 'converted', 'analyzing', 'completed']

export default function Upload() {
  const [dragging, setDragging] = useState(false)
  const [resumeId, setResumeId] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('idle')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const navigate = useNavigate()

  const currentStageIdx = STATUS_ORDER.indexOf(status)

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.pdf')) {
      toast.error('Please upload a valid PDF resume.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File exceeds 10MB limit.')
      return
    }
    setUploading(true)
    setStatus('uploaded')
    try {
      const res = await resumeApi.upload(file)
      const id = res.data.data.resume_id
      setResumeId(id)
      setStatus('extracting')
    } catch (e: any) {
      toast.error(e.message)
      setStatus('idle')
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    if (!resumeId) return
    pollRef.current = setInterval(async () => {
      try {
        const res = await resumeApi.getStatus(resumeId)
        const s = res.data.data.processing_status
        setStatus(s)
        if (s === 'completed') {
          clearInterval(pollRef.current!)
          setTimeout(() => navigate('/dashboard'), 1000)
        } else if (s === 'failed') {
          clearInterval(pollRef.current!)
          toast.error('AI analysis failed. Your resume is safe — try again.')
        }
      } catch {}
    }, 2000)
    return () => clearInterval(pollRef.current!)
  }, [resumeId, navigate])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  const isProcessing = status !== 'idle' && status !== 'failed'

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 34, marginBottom: 8 }}>Upload your resume</h2>
      <p className="text-muted" style={{ fontSize: 14 }}>
        PDF only. Text is extracted with PyMuPDF, hashed, and stored — the raw lines are what every citation points back to.
      </p>

      {/* Drop zone */}
      {!isProcessing && (
        <>
          <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            style={{
              marginTop: 32,
              border: `2px dashed ${dragging ? 'var(--color-accent)' : 'var(--color-divider)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '48px 24px',
              textAlign: 'center',
              cursor: uploading ? 'default' : 'pointer',
              background: dragging ? 'color-mix(in srgb, var(--color-accent) 5%, transparent)' : 'transparent',
              transition: 'all 0.15s',
            }}
          >
            <UploadIcon size={32} style={{ color: 'var(--color-neutral-600)', margin: '0 auto 12px' }} />
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, marginBottom: 6 }}>
              {uploading ? 'Uploading…' : 'Drop your PDF here'}
            </div>
            <div className="text-muted" style={{ fontSize: 13 }}>
              {uploading ? 'Please wait' : 'or click to browse · 10MB max'}
            </div>
          </div>
        </>
      )}

      {/* Processing stages */}
      {status !== 'idle' && (
        <div style={{ marginTop: 32, display: 'grid', gap: 8 }}>
          {STAGES.map((st, i) => {
            const done = STATUS_ORDER.indexOf(st.key) < currentStageIdx
            const active = STATUS_ORDER.indexOf(st.key) === currentStageIdx
            const pending = STATUS_ORDER.indexOf(st.key) > currentStageIdx
            return (
              <div
                key={st.key}
                className={done || active ? 'animate-rise' : ''}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  border: '1px solid var(--color-divider)',
                  borderRadius: 'var(--radius-md)',
                  opacity: pending ? 0.4 : 1,
                  transition: 'opacity 0.3s',
                }}
              >
                {done ? (
                  <CheckCircle size={16} style={{ color: 'var(--color-accent)' }} />
                ) : active ? (
                  <Loader size={16} style={{ color: 'var(--color-accent)', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Circle size={16} style={{ color: 'var(--color-neutral-600)' }} />
                )}
                <span style={{ fontSize: 14, color: active ? 'var(--color-text)' : done ? 'var(--color-text)' : 'var(--color-neutral-600)' }}>
                  {st.label}
                </span>
                <span className="text-muted" style={{ marginLeft: 'auto', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
                  {done ? '✓' : active ? '…' : ''}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {status === 'completed' && (
        <div style={{ marginTop: 24, textAlign: 'center', color: 'var(--color-accent-700)', fontFamily: 'var(--font-heading)', fontSize: 16 }}>
          All done — redirecting to your dashboard…
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
