import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { adminApi } from '../../lib/adminApi'

interface Pricing {
  model: string
  provider: string
  input_cost_per_1m: number
  output_cost_per_1m: number
  currency: string
}

interface AIModel {
  id: string
  label: string
  provider: string
  description: string
  free_tier_daily_limit: number
  input_cost_per_1m: number
  output_cost_per_1m: number
  is_active: boolean
  calls_24h: number
  successes_24h: number
}

export default function AdminSystem() {
  const [pricing, setPricing] = useState<Pricing[]>([])
  const [models, setModels] = useState<AIModel[]>([])
  const [activeModel, setActiveModel] = useState<string>('')
  const [switching, setSwitching] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadConfig = () =>
    adminApi.getAIConfig().then(r => {
      setModels(r.data.data.models)
      setActiveModel(r.data.data.active_model)
    })

  useEffect(() => {
    Promise.all([
      adminApi.getSystem().then(r => setPricing(r.data.data.active_pricing)),
      loadConfig(),
    ])
      .catch(() => toast.error('Failed to load system settings'))
      .finally(() => setLoading(false))
  }, [])

  const handleSelect = async (modelId: string) => {
    if (modelId === activeModel || switching) return
    setSwitching(modelId)
    try {
      const res = await adminApi.setAIModel(modelId)
      setActiveModel(res.data.data.active_model)
      await loadConfig()
      toast.success(res.data.message || 'AI model updated')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to switch model')
    } finally {
      setSwitching(null)
    }
  }

  if (loading) {
    return <div className="text-muted" style={{ fontSize: 13, fontStyle: 'italic' }}>Loading…</div>
  }

  return (
    <div>
      <div className="card-kicker">Admin</div>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, marginTop: 4, marginBottom: 32 }}>System</h2>

      <div style={{ maxWidth: 720 }}>
        {/* ── AI Model Selection ─────────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-kicker">Active AI Model</div>
          <p className="text-muted" style={{ fontSize: 13, marginTop: 4, marginBottom: 20 }}>
            Applies to every AI operation — resume analysis, gap analysis, roadmaps, quizzes
            and interviews. Changes take effect immediately; no restart needed.
          </p>

          <div style={{ display: 'grid', gap: 12 }}>
            {models.map(m => {
              const isActive = m.id === activeModel
              const isBusy = switching === m.id
              const successRate = m.calls_24h > 0
                ? Math.round((m.successes_24h / m.calls_24h) * 100)
                : null

              return (
                <button
                  key={m.id}
                  onClick={() => handleSelect(m.id)}
                  disabled={!!switching}
                  style={{
                    textAlign: 'left',
                    padding: '16px 18px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${isActive ? 'var(--color-accent)' : 'var(--color-divider)'}`,
                    background: isActive
                      ? 'color-mix(in srgb, var(--color-accent) 7%, transparent)'
                      : 'transparent',
                    cursor: switching ? 'wait' : isActive ? 'default' : 'pointer',
                    opacity: switching && !isBusy ? 0.5 : 1,
                    transition: 'border-color 140ms ease, background 140ms ease',
                    font: 'inherit',
                    color: 'inherit',
                    width: '100%',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    {/* radio dot */}
                    <span
                      style={{
                        width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                        border: `1px solid ${isActive ? 'var(--color-accent)' : 'var(--color-neutral-600)'}`,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {isActive && (
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-accent)' }} />
                      )}
                    </span>

                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 17 }}>{m.label}</span>

                    {isActive && <span className="tag tag-accent">Active</span>}
                    {isBusy && (
                      <span className="text-muted" style={{ fontSize: 11, fontStyle: 'italic' }}>
                        switching…
                      </span>
                    )}
                  </div>

                  <div className="text-muted" style={{ fontSize: 13, marginLeft: 24, marginBottom: 8 }}>
                    {m.description}
                  </div>

                  <div
                    style={{
                      marginLeft: 24, display: 'flex', flexWrap: 'wrap',
                      gap: '4px 20px', fontSize: 11,
                    }}
                  >
                    <span className="text-muted">
                      Model ID: <code style={{ color: 'var(--color-text)' }}>{m.id}</code>
                    </span>
                    <span className="text-muted">
                      Free tier:{' '}
                      <span style={{ color: 'var(--color-text)' }}>
                        {m.free_tier_daily_limit.toLocaleString()} req/day
                      </span>
                    </span>
                    <span className="text-muted">
                      Last 24h:{' '}
                      <span style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
                        {m.calls_24h} calls
                      </span>
                      {successRate !== null && (
                        <span
                          style={{
                            marginLeft: 6,
                            color: successRate >= 95 ? 'var(--color-accent-700)'
                              : successRate >= 80 ? '#d97706' : '#dc2626',
                          }}
                        >
                          ({successRate}% ok)
                        </span>
                      )}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          <div
            className="text-muted"
            style={{ fontSize: 11, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--color-divider)' }}
          >
            If the selected model hits its quota or goes down, the system automatically retries
            the request on the other model and records it in the usage log.
          </div>
        </div>

        {/* ── Pricing ────────────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-kicker">Active AI Pricing</div>

          {pricing.length === 0 ? (
            <div className="text-muted" style={{ fontSize: 13, fontStyle: 'italic' }}>No pricing configured</div>
          ) : pricing.map(p => (
            <div key={p.model} style={{ borderBottom: '1px solid var(--color-divider)', paddingBottom: 16, marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 17, marginBottom: 6 }}>
                {p.model}
                {p.model === activeModel && (
                  <span className="tag tag-accent" style={{ marginLeft: 8 }}>In use</span>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', fontSize: 13 }}>
                <span className="text-muted">Provider: <span style={{ color: 'var(--color-text)' }}>{p.provider}</span></span>
                <span className="text-muted">Input: <span style={{ color: 'var(--color-text)' }}>${p.input_cost_per_1m}/1M</span></span>
                <span className="text-muted">Output: <span style={{ color: 'var(--color-text)' }}>${p.output_cost_per_1m}/1M</span></span>
                <span className="text-muted">Currency: <span style={{ color: 'var(--color-text)' }}>{p.currency}</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
