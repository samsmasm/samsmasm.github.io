import { notFound } from 'next/navigation'
import Link from 'next/link'
import { curriculum, getModule, getPhase } from '@/lib/curriculum'
import type { Resource } from '@/types/curriculum'

const RESOURCE_TYPE_ICONS: Record<string, string> = {
  text: '📖', video: '🎬', exercises: '✏️',
  interactive: '🔢', tool: '🛠', advanced: '🎓', theory: '∮',
}

const ROLE_ORDER = ['primary', 'alternative', 'supplementary', 'solutions', 'environment', 'advanced', 'theory']

const ROLE_LABELS: Record<string, string> = {
  primary: 'Primary textbook', alternative: 'Alternative text',
  supplementary: 'Supplementary', solutions: 'Solutions & practice',
  environment: 'Tools', advanced: 'Advanced reading', theory: 'Theory reference',
}

function ResourceGroup({ resources, groupLabel }: { resources: Resource[]; groupLabel: string }) {
  if (!resources.length) return null
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
        {groupLabel}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {resources.map((r, i) => (
          <a
            key={i}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="resource-link"
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 12px', borderRadius: 6,
              background: 'var(--bg-subtle)', border: '1px solid var(--border)',
              textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: 14, marginTop: 1, flexShrink: 0 }}>{RESOURCE_TYPE_ICONS[r.type] ?? '📄'}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3 }}>{r.title}</div>
              {r.author && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, fontStyle: 'italic' }}>{r.author}</div>}
              <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                <span style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 3,
                  background: r.free ? '#f0fdf4' : '#fef2f2',
                  color: r.free ? '#15803d' : '#dc2626',
                  border: `1px solid ${r.free ? '#bbf7d0' : '#fecaca'}`,
                }}>
                  {r.free ? 'Free' : 'Paid'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{r.type}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

function Card({ children, accentColor }: { children: React.ReactNode; accentColor?: string }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '20px',
      borderLeft: accentColor ? `3px solid ${accentColor}` : undefined,
    }}>
      {children}
    </div>
  )
}

function CardLabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{
      fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
      color: color ?? 'var(--text-3)', fontFamily: 'var(--font-mono)',
      marginBottom: 10,
    }}>
      {children}
    </div>
  )
}

export async function generateStaticParams() {
  return curriculum.modules.map(m => ({ id: m.id }))
}

export default async function ModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const module = getModule(id)
  if (!module) notFound()

  const phase = getPhase(module.phase)!
  const prereqModules = module.prerequisites.map(pid => getModule(pid)).filter(Boolean)
  const unlocksModules = module.unlocks.map(uid => getModule(uid)).filter(Boolean)

  const resourcesByRole = ROLE_ORDER.reduce<Record<string, Resource[]>>((acc, role) => {
    const group = module.resources.filter(r => r.role === role)
    if (group.length) acc[role] = group
    return acc
  }, {})

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-3)', marginBottom: '1.75rem', fontFamily: 'var(--font-mono)' }}>
        <Link href="/" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>mymaths</Link>
        <span>/</span>
        <span style={{ color: phase.color }}>{phase.label}</span>
        <span>/</span>
        <span>{module.id}</span>
      </nav>

      {/* Module header */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderLeft: `4px solid ${phase.color}`,
        borderRadius: 8,
        padding: '24px 28px',
        marginBottom: '2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600,
            color: phase.color, letterSpacing: '0.06em',
          }}>
            {module.id}
          </span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {module.critical_path && (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
                ⚡ Critical path
              </span>
            )}
            {module.specialisation_track && (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe', fontFamily: 'var(--font-mono)' }}>
                Track {module.specialisation_track}
              </span>
            )}
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-subtle)', color: 'var(--text-2)', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>
              {module.duration_weeks}wk · {module.load_hrs_week}h/wk
            </span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-subtle)', color: 'var(--text-3)', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>
              wk {module.gantt_start_week}–{module.gantt_end_week}
            </span>
          </div>
        </div>
        <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 500, lineHeight: 1.2, color: 'var(--text)', letterSpacing: '-0.02em' }}>
          {module.name}
        </h1>
      </div>

      {/* Two-column */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>

        {/* Main */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          <Card>
            <CardLabel>Overview</CardLabel>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text)' }}>{module.description}</p>
          </Card>

          <Card accentColor={phase.color}>
            <CardLabel color={phase.color}>Why this matters</CardLabel>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-2)', fontStyle: 'italic' }}>{module.why_it_matters}</p>
          </Card>

          <Card>
            <CardLabel>Learning outcomes</CardLabel>
            <ol style={{ display: 'flex', flexDirection: 'column', gap: 10, listStyle: 'none', padding: 0, margin: 0 }}>
              {module.learning_outcomes.map((lo, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{
                    flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
                    background: phase.color + '18', border: `1px solid ${phase.color}50`,
                    color: phase.color, fontSize: 11, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: 1, fontFamily: 'var(--font-mono)',
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)' }}>{lo}</span>
                </li>
              ))}
            </ol>
          </Card>

          <Card accentColor="#d97706">
            <CardLabel color="#92400e">⚡ Milestone checkpoint</CardLabel>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)' }}>{module.milestone}</p>
          </Card>

          <Card accentColor="#3b82f6">
            <CardLabel color="#1d4ed8">AI integration</CardLabel>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-2)' }}>{module.ai_integration}</p>
          </Card>

        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          <Card>
            <CardLabel>Resources</CardLabel>
            {ROLE_ORDER.map(role =>
              resourcesByRole[role] ? (
                <ResourceGroup key={role} resources={resourcesByRole[role]} groupLabel={ROLE_LABELS[role] ?? role} />
              ) : null
            )}
          </Card>

          {prereqModules.length > 0 && (
            <Card>
              <CardLabel>Prerequisites</CardLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {prereqModules.map(m => {
                  const p = getPhase(m!.phase)!
                  return (
                    <Link
                      key={m!.id}
                      href={`/modules/${m!.id}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 10px', borderRadius: 5,
                        background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                        textDecoration: 'none',
                      }}
                    >
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600, color: p.color }}>{m!.id}</span>
                      <span style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m!.short_name}</span>
                    </Link>
                  )
                })}
              </div>
            </Card>
          )}

          {unlocksModules.length > 0 && (
            <Card>
              <CardLabel>Unlocks</CardLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {unlocksModules.map(m => {
                  const p = getPhase(m!.phase)!
                  return (
                    <Link
                      key={m!.id}
                      href={`/modules/${m!.id}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 10px', borderRadius: 5,
                        background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                        textDecoration: 'none',
                      }}
                    >
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600, color: p.color }}>{m!.id}</span>
                      <span style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m!.short_name}</span>
                    </Link>
                  )
                })}
              </div>
            </Card>
          )}

          {module.university_equivalents.length > 0 && (
            <Card>
              <CardLabel>University equivalents</CardLabel>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {module.university_equivalents.map((eq, i) => (
                  <li key={i} style={{ fontSize: 12, color: 'var(--text-2)', fontStyle: 'italic' }}>{eq}</li>
                ))}
              </ul>
            </Card>
          )}

        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" style={{ fontSize: 13, color: 'var(--text-2)', textDecoration: 'none' }}>
          ← Back to curriculum
        </Link>
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{module.id}</span>
      </div>

    </div>
  )
}
