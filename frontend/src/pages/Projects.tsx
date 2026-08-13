import { useEffect, useState } from 'react'
import { projectRecsApi } from '../lib/api'
import { Loader } from 'lucide-react'
import toast from 'react-hot-toast'

interface Project {
  id: string
  title: string
  type: string
  type_label: string
  duration_weeks_min: number
  duration_weeks_max: number
  description: string
  technologies: string[]
  closes_gaps: string[]
  gap_count_closed: number
  learning_outcomes: string[]
  estimated_hours: number
  difficulty: string
  repo_structure_hint: string
}

interface RecsData {
  target_role: string
  total_open_gaps: number
  projects: Project[]
}

const TYPE_COLOR: Record<string, string> = {
  flagship:       'var(--color-accent)',
  infrastructure: '#2563eb',
  depth:          '#059669',
  starter:        '#7c3aed',
}

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner:     'Beginner-friendly',
  intermediate: 'Intermediate',
  advanced:     'Advanced',
}

function ProjectCard({ project, totalGaps }: { project: Project; totalGaps: number }) {
  const [expanded, setExpanded] = useState(false)
  const accentColor = TYPE_COLOR[project.type] || 'var(--color-accent)'
  const coveragePct = totalGaps > 0
    ? Math.round((project.gap_count_closed / totalGaps) * 100)
    : 0

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '24px 24px 20px',
        borderTop: `3px solid ${accentColor}`,
        transition: 'box-shadow 0.15s',
        cursor: 'default',
      }}
    >
      {/* Kicker */}
      <div style={{
        fontSize: 10,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: accentColor,
        fontFamily: 'var(--font-body)',
        fontWeight: 600,
      }}>
        {project.duration_weeks_min}–{project.duration_weeks_max} weeks · {project.type_label || project.type.toUpperCase()}
      </div>

      {/* Title */}
      <h3 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: 22,
        margin: 0,
        lineHeight: 1.25,
        color: 'var(--color-text)',
      }}>
        {project.title}
      </h3>

      {/* Description */}
      <p style={{
        fontSize: 13,
        lineHeight: 1.65,
        color: 'color-mix(in srgb, var(--color-text) 80%, transparent)',
        margin: 0,
      }}>
        {project.description}
      </p>

      {/* Tech tags */}
      {project.technologies?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {project.technologies.map((t, i) => (
            <span key={i} className="tag tag-neutral" style={{ fontSize: 11 }}>{t}</span>
          ))}
        </div>
      )}

      {/* Outcomes toggle */}
      {project.learning_outcomes?.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, color: 'var(--color-neutral-600)',
              padding: 0, display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <span style={{
              display: 'inline-block',
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s',
            }}>▶</span>
            {expanded ? 'Hide' : 'Show'} learning outcomes
          </button>
          {expanded && (
            <ul style={{
              margin: '10px 0 0 0',
              paddingLeft: 18,
              display: 'grid',
              gap: 4,
            }}>
              {project.learning_outcomes.map((o, i) => (
                <li key={i} style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--color-text)' }}>{o}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <hr style={{ border: 'none', borderTop: '1px solid var(--color-divider)', margin: '4px 0' }} />

      {/* Closes gaps */}
      {project.closes_gaps?.length > 0 && (
        <div>
          <div style={{
            fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--color-neutral-600)', marginBottom: 8,
          }}>
            Closes
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {project.closes_gaps.map((g, i) => (
              <span key={i} style={{
                fontSize: 11, padding: '3px 10px',
                border: `1px solid ${accentColor}`,
                borderRadius: 20,
                color: accentColor,
                fontFamily: 'var(--font-body)',
              }}>
                {g}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer: hours + coverage */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
      }}>
        <span className="text-muted" style={{ fontSize: 12 }}>
          ~{project.estimated_hours} hrs
        </span>
        <span style={{
          fontSize: 12,
          color: accentColor,
          fontFamily: 'var(--font-body)',
          fontWeight: 500,
        }}>
          covers {project.gap_count_closed}/{totalGaps} of your open gaps
        </span>
      </div>

      {/* Repo hint */}
      {project.repo_structure_hint && (
        <div style={{
          fontSize: 11,
          color: 'var(--color-neutral-600)',
          fontStyle: 'italic',
          borderLeft: '2px solid var(--color-divider)',
          paddingLeft: 10,
        }}>
          {project.repo_structure_hint}
        </div>
      )}
    </div>
  )
}

export default function Projects() {
  const [data, setData] = useState<RecsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await projectRecsApi.get(refresh)
      setData(res.data.data)
    } catch (e: any) {
      toast.error(e.message || 'Failed to load project recommendations')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
        <Loader size={18} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-accent)' }} />
        <span className="text-muted" style={{ fontSize: 13 }}>Generating project ideas from your resume…</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
        <p className="text-muted" style={{ fontStyle: 'italic', fontSize: 14 }}>
          No project recommendations yet. Complete your gap analysis first.
        </p>
      </div>
    )
  }

  const { projects = [], total_open_gaps, target_role } = data

  return (
    <div className="sf-page" style={{ maxWidth: 1160 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginBottom: 8 }}>
        <div>
          <div className="card-kicker" style={{ marginBottom: 8 }}>
            {target_role} · {total_open_gaps} open gaps
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 36, margin: 0 }}>
            Recommended projects
          </h2>
          <p className="text-muted" style={{ fontSize: 13, marginTop: 10, maxWidth: '68ch', lineHeight: 1.6 }}>
            Bigger than the weekly minis. Each is scoped to close several open gaps at once, so a
            single repo moves multiple axes of the radar.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => load(true)}
          disabled={refreshing}
          style={{ border: '1px solid var(--color-divider)', flexShrink: 0, marginTop: 8 }}
        >
          {refreshing
            ? <><Loader size={12} style={{ animation: 'spin 1s linear infinite', display: 'inline', marginRight: 6 }} />Generating…</>
            : '↻ Regenerate'
          }
        </button>
      </div>

      <hr className="hr" style={{ marginBottom: 32 }} />

      {/* Cards grid */}
      {projects.length === 0 ? (
        <div className="text-muted" style={{ textAlign: 'center', fontStyle: 'italic', padding: '48px 0', fontSize: 14 }}>
          No projects generated. Try regenerating above.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
          gap: 20,
        }}>
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} totalGaps={total_open_gaps} />
          ))}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
