import { notFound } from 'next/navigation'
import Link from 'next/link'
import { curriculum, getModule, getPhase } from '@/lib/curriculum'
import type { Resource } from '@/types/curriculum'

const RESOURCE_TYPE_ICONS: Record<string, string> = {
  text: '📖',
  video: '🎬',
  exercises: '✏️',
  interactive: '🔢',
  tool: '🛠',
  advanced: '🎓',
  theory: '∮',
}

const ROLE_ORDER = ['primary', 'alternative', 'supplementary', 'solutions', 'environment', 'advanced', 'theory']

function ResourceGroup({ resources, groupLabel }: { resources: Resource[]; groupLabel: string }) {
  if (!resources.length) return null
  return (
    <div className="mb-4">
      <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#475569' }}>
        {groupLabel}
      </div>
      <div className="flex flex-col gap-2">
        {resources.map((r, i) => (
          <a
            key={i}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 p-3 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: '#1e293b', border: '1px solid #334155' }}
          >
            <span className="text-base mt-0.5 shrink-0">{RESOURCE_TYPE_ICONS[r.type] ?? '📄'}</span>
            <div className="min-w-0">
              <div className="text-sm font-medium leading-snug" style={{ color: '#f1f5f9' }}>
                {r.title}
              </div>
              {r.author && (
                <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                  {r.author}
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    background: r.free ? '#16a34a20' : '#dc262620',
                    color: r.free ? '#4ade80' : '#f87171',
                  }}
                >
                  {r.free ? 'Free' : 'Paid'}
                </span>
                <span className="text-xs" style={{ color: '#475569' }}>
                  {r.type}
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
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

  // Group resources by role
  const resourcesByRole = ROLE_ORDER.reduce<Record<string, Resource[]>>((acc, role) => {
    const group = module.resources.filter(r => r.role === role)
    if (group.length) acc[role] = group
    return acc
  }, {})

  const roleLabelMap: Record<string, string> = {
    primary: 'Primary Textbook',
    alternative: 'Alternative Text',
    supplementary: 'Supplementary',
    solutions: 'Solutions / Practice',
    environment: 'Tools & Environment',
    advanced: 'Advanced Reading',
    theory: 'Theory Reference',
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-6" style={{ color: '#475569' }}>
        <Link href="/" className="hover:underline" style={{ color: '#64748b' }}>Home</Link>
        <span>/</span>
        <span style={{ color: phase.color }}>{phase.label} · {phase.name}</span>
        <span>/</span>
        <span style={{ color: '#94a3b8' }}>{module.id}</span>
      </nav>

      {/* Module header */}
      <div
        className="rounded-xl p-6 mb-8"
        style={{
          background: '#0f172a',
          border: `1px solid ${phase.color}40`,
          borderLeft: `4px solid ${phase.color}`,
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <span
            className="text-sm font-mono font-bold px-2 py-1 rounded"
            style={{ background: phase.color + '20', color: phase.color }}
          >
            {module.id}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {module.critical_path && (
              <span
                className="text-xs px-2 py-1 rounded font-medium"
                style={{ background: '#f59e0b20', color: '#f59e0b' }}
              >
                ⚡ Critical Path
              </span>
            )}
            {module.specialisation_track && (
              <span
                className="text-xs px-2 py-1 rounded font-medium"
                style={{ background: '#8b5cf620', color: '#8b5cf6' }}
              >
                Track {module.specialisation_track}
              </span>
            )}
            <span
              className="text-xs px-2 py-1 rounded"
              style={{ background: '#1e293b', color: '#94a3b8' }}
            >
              {module.duration_weeks} weeks · {module.load_hrs_week} hrs/wk
            </span>
            <span
              className="text-xs px-2 py-1 rounded"
              style={{ background: '#1e293b', color: '#64748b' }}
            >
              Wk {module.gantt_start_week}–{module.gantt_end_week}
            </span>
          </div>
        </div>
        <h1
          className="text-3xl font-bold leading-tight"
          style={{ fontFamily: 'Georgia, serif', color: '#f1f5f9' }}
        >
          {module.name}
        </h1>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Main content — 2 cols */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Description */}
          <section
            className="rounded-xl p-5"
            style={{ background: '#0f172a', border: '1px solid #1e293b' }}
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#475569' }}>
              Overview
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: '#cbd5e1' }}>
              {module.description}
            </p>
          </section>

          {/* Why it matters */}
          <section
            className="rounded-xl p-5"
            style={{ background: '#0c1829', border: `1px solid ${phase.color}25` }}
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: phase.color }}>
              Why This Matters
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
              {module.why_it_matters}
            </p>
          </section>

          {/* Learning outcomes */}
          <section
            className="rounded-xl p-5"
            style={{ background: '#0f172a', border: '1px solid #1e293b' }}
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#475569' }}>
              Learning Outcomes
            </h2>
            <ol className="flex flex-col gap-2.5">
              {module.learning_outcomes.map((lo, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono font-bold mt-0.5"
                    style={{ background: phase.color + '25', color: phase.color }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm leading-relaxed" style={{ color: '#cbd5e1' }}>{lo}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Milestone */}
          <section
            className="rounded-xl p-5"
            style={{ background: '#0f172a', border: '1px solid #f59e0b30' }}
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#f59e0b' }}>
              ⚡ Milestone Checkpoint
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: '#cbd5e1' }}>
              {module.milestone}
            </p>
          </section>

          {/* AI integration */}
          <section
            className="rounded-xl p-5"
            style={{ background: '#0f172a', border: '1px solid #3b82f630' }}
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#3b82f6' }}>
              AI Integration
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
              {module.ai_integration}
            </p>
          </section>

        </div>

        {/* Sidebar — 1 col */}
        <div className="flex flex-col gap-5">

          {/* Resources */}
          <section
            className="rounded-xl p-5"
            style={{ background: '#0f172a', border: '1px solid #1e293b' }}
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#475569' }}>
              Resources
            </h2>
            {ROLE_ORDER.map(role => (
              resourcesByRole[role] ? (
                <ResourceGroup
                  key={role}
                  resources={resourcesByRole[role]}
                  groupLabel={roleLabelMap[role] ?? role}
                />
              ) : null
            ))}
          </section>

          {/* Prerequisites */}
          {prereqModules.length > 0 && (
            <section
              className="rounded-xl p-5"
              style={{ background: '#0f172a', border: '1px solid #1e293b' }}
            >
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#475569' }}>
                Prerequisites
              </h2>
              <div className="flex flex-col gap-2">
                {prereqModules.map(m => {
                  const p = getPhase(m!.phase)!
                  return (
                    <Link
                      key={m!.id}
                      href={`/modules/${m!.id}`}
                      className="flex items-center gap-2 p-2.5 rounded-lg transition-opacity hover:opacity-80"
                      style={{ background: '#1e293b', border: '1px solid #334155' }}
                    >
                      <span
                        className="text-xs font-mono font-bold px-1.5 py-0.5 rounded"
                        style={{ background: p.color + '20', color: p.color }}
                      >
                        {m!.id}
                      </span>
                      <span className="text-sm truncate" style={{ color: '#cbd5e1' }}>
                        {m!.short_name}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* Unlocks */}
          {unlocksModules.length > 0 && (
            <section
              className="rounded-xl p-5"
              style={{ background: '#0f172a', border: '1px solid #1e293b' }}
            >
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#475569' }}>
                Unlocks
              </h2>
              <div className="flex flex-col gap-2">
                {unlocksModules.map(m => {
                  const p = getPhase(m!.phase)!
                  return (
                    <Link
                      key={m!.id}
                      href={`/modules/${m!.id}`}
                      className="flex items-center gap-2 p-2.5 rounded-lg transition-opacity hover:opacity-80"
                      style={{ background: '#1e293b', border: '1px solid #334155' }}
                    >
                      <span
                        className="text-xs font-mono font-bold px-1.5 py-0.5 rounded"
                        style={{ background: p.color + '20', color: p.color }}
                      >
                        {m!.id}
                      </span>
                      <span className="text-sm truncate" style={{ color: '#cbd5e1' }}>
                        {m!.short_name}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* University equivalents */}
          {module.university_equivalents.length > 0 && (
            <section
              className="rounded-xl p-5"
              style={{ background: '#0f172a', border: '1px solid #1e293b' }}
            >
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#475569' }}>
                University Equivalents
              </h2>
              <ul className="flex flex-col gap-1.5">
                {module.university_equivalents.map((eq, i) => (
                  <li key={i} className="text-xs" style={{ color: '#64748b' }}>
                    {eq}
                  </li>
                ))}
              </ul>
            </section>
          )}

        </div>
      </div>

      {/* Bottom nav */}
      <div className="mt-10 pt-6 flex justify-between items-center" style={{ borderTop: '1px solid #1e293b' }}>
        <Link
          href="/"
          className="text-sm hover:underline"
          style={{ color: '#64748b' }}
        >
          ← Back to curriculum
        </Link>
        <span className="text-xs font-mono" style={{ color: '#334155' }}>
          {module.id}
        </span>
      </div>

    </div>
  )
}
