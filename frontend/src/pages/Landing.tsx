import { useNavigate } from 'react-router-dom'

const POINTS = [
  { n: '87%', title: 'Evidence first', body: 'Every skill needs a quote from your resume before it enters the gap model. Listed without proof = weak evidence, not a skill.' },
  { n: '8 wks', title: 'Ordered roadmap', body: 'Weeks are sorted by gap_size × market_demand × prerequisite readiness — not by catalog order.' },
  { n: '5 Qs', title: 'Checkpoint quiz', body: '≥80% acquires the skill and re-scores every gap. Below 50% demotes it and inserts a prerequisite.' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="sf-page">
      <div className="sf-split-hero">
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>
            For students · 2026 job market
          </div>
          <h1
            className="sf-h1"
            style={{ fontSize: 'clamp(34px, 7vw, 58px)', lineHeight: 1.04, letterSpacing: '-0.02em', margin: '16px 0' }}
          >
            Every recommendation<br />carries a receipt.
          </h1>
          <p style={{ fontSize: 'clamp(15px, 2.2vw, 17px)', lineHeight: 1.65, maxWidth: '46ch' }}>
            SkillForge reads your resume, extracts skills only where it can quote the line they came from, compares them against live job descriptions for your target role, and returns a week-by-week roadmap that reorders itself as you prove competence.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginTop: 24 }}>
            <button className="btn btn-primary" onClick={() => navigate('/register')} style={{ fontSize: 15, padding: '12px 22px' }}>
              Analyze My Resume
            </button>
            <span className="text-muted" style={{ fontSize: 12 }}>Free · 30 seconds to a roadmap.</span>
          </div>
        </div>

        <div className="card">
          <div className="card-kicker">The difference</div>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 15, marginBottom: 6 }}>Generic course recommender</div>
            <p className="text-muted" style={{ fontSize: 13, fontStyle: 'italic' }}>"You should learn React. Here are 40 courses."</p>
          </div>
          <hr className="hr" style={{ margin: 0 }} />
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 15, marginBottom: 6 }}>SkillForge</div>
            <p style={{ fontSize: 13, lineHeight: 1.6 }}>
              "React appears in <strong>87%</strong> of Full Stack postings. You listed it under <em>Skills</em> but no project backs it — that's <strong>weak evidence</strong>, not a skill. Week 3 closes it with one mini-project and a checkpoint."
            </p>
          </div>
        </div>
      </div>

      <hr className="hr" style={{ margin: '48px 0 24px' }} />
      <div className="sf-cols-3">
        {POINTS.map((p) => (
          <div key={p.n}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 34, fontWeight: 400, color: 'var(--color-accent)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{p.n}</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, margin: '8px 0 6px' }}>{p.title}</div>
            <p className="text-muted" style={{ fontSize: 13, lineHeight: 1.6 }}>{p.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
