import { curriculum } from '@/lib/curriculum'
import ModuleCard from '@/components/ModuleCard'
import DependencyGraph from '@/components/DependencyGraph'
import GanttChart from '@/components/GanttChart'

export default function Home() {
  const { meta, phases, modules, critical_path } = curriculum

  const totalHours = Math.round(meta.estimated_weeks_min * meta.hours_per_week)
  const criticalLength = critical_path.pure_analysis_track.length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

      {/* Hero */}
      <div className="mb-10">
        <h1
          className="text-4xl font-bold tracking-tight mb-2"
          style={{ fontFamily: 'Georgia, serif', color: '#f1f5f9' }}
        >
          {meta.title}
        </h1>
        <p className="text-lg mb-6" style={{ color: '#64748b' }}>
          {meta.subtitle}
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Modules', value: meta.total_modules.toString() },
            { label: 'Min. Weeks', value: meta.estimated_weeks_min.toString() },
            { label: 'Est. Hours', value: totalHours.toLocaleString() },
            { label: 'Critical Steps', value: criticalLength.toString() },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl p-4"
              style={{ background: '#0f172a', border: '1px solid #1e293b' }}
            >
              <div className="text-2xl font-bold font-mono" style={{ color: '#f1f5f9' }}>{value}</div>
              <div className="text-xs mt-1" style={{ color: '#475569' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Tracks */}
        <div className="mt-4 flex flex-wrap gap-3">
          {meta.specialisation_tracks.map(t => (
            <div
              key={t.id}
              className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full"
              style={{ background: '#1e293b', color: '#94a3b8' }}
            >
              <span
                className="text-xs font-mono font-bold px-1.5 py-0.5 rounded"
                style={{ background: '#8b5cf620', color: '#8b5cf6' }}
              >
                Track {t.id}
              </span>
              {t.name}
            </div>
          ))}
          <div
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full"
            style={{ background: '#1e293b', color: '#94a3b8' }}
          >
            <span style={{ color: '#f59e0b' }}>⚡</span>
            {meta.hours_per_week} hrs/week target
          </div>
        </div>
      </div>

      {/* Dependency Graph */}
      <section className="mb-10">
        <DependencyGraph modules={modules} phases={phases} />
      </section>

      {/* Gantt Chart */}
      <section className="mb-12">
        <GanttChart modules={modules} phases={phases} />
      </section>

      {/* Phase sections */}
      {phases.map(phase => {
        const phaseModules = modules.filter(m => m.phase === phase.id)
        return (
          <section key={phase.id} className="mb-10">
            <div className="flex items-baseline gap-3 mb-4">
              <span
                className="text-xs font-mono font-bold px-2 py-1 rounded"
                style={{ background: phase.color + '20', color: phase.color }}
              >
                {phase.label}
              </span>
              <h2
                className="text-xl font-bold"
                style={{ color: '#f1f5f9', fontFamily: 'Georgia, serif' }}
              >
                {phase.name}
              </h2>
              <span className="text-sm" style={{ color: '#475569' }}>
                ~{phase.duration_months_approx} months
              </span>
            </div>
            <p className="text-sm mb-4" style={{ color: '#64748b', maxWidth: '64ch' }}>
              {phase.goal}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {phaseModules.map(m => (
                <ModuleCard key={m.id} module={m} phase={phase} />
              ))}
            </div>
          </section>
        )
      })}

      {/* Critical path callout */}
      <section
        className="rounded-xl p-5 mb-10"
        style={{ background: '#0f172a', border: '1px solid #f59e0b30' }}
      >
        <h2 className="text-base font-semibold mb-3" style={{ color: '#f59e0b' }}>
          ⚡ Critical Path — Pure Analysis Track
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {critical_path.pure_analysis_track.map((id, i) => (
            <span key={id} className="flex items-center gap-2">
              <a
                href={`/modules/${id}`}
                className="text-sm font-mono px-2 py-1 rounded transition-opacity hover:opacity-80"
                style={{ background: '#f59e0b20', color: '#f59e0b' }}
              >
                {id}
              </a>
              {i < critical_path.pure_analysis_track.length - 1 && (
                <span style={{ color: '#334155' }}>→</span>
              )}
            </span>
          ))}
        </div>
        <p className="text-xs mt-3" style={{ color: '#475569' }}>
          Bottlenecks (cannot be parallelised): {critical_path.bottleneck_modules.join(', ')}
        </p>
      </section>

    </div>
  )
}
