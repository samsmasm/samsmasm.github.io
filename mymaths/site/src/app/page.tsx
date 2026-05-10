import { curriculum } from '@/lib/curriculum'
import DependencyGraph from '@/components/DependencyGraph'
import GanttChart from '@/components/GanttChart'
import FilteredModuleGrid from '@/components/FilteredModuleGrid'

export default function Home() {
  const { meta, phases, modules, critical_path } = curriculum
  const totalHours = Math.round(meta.estimated_weeks_min * meta.hours_per_week)

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 1.5rem 4rem' }}>

      {/* Hero */}
      <div style={{ marginBottom: '3rem', paddingBottom: '2.5rem', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.75rem' }}>
          Personal study plan
        </p>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)', fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: '0.5rem' }}>
          {meta.title}
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-2)', marginBottom: '2rem', fontStyle: 'italic' }}>
          {meta.subtitle}
        </p>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', maxWidth: 560 }}>
          {[
            { label: 'Modules', value: meta.total_modules },
            { label: 'Min. weeks', value: meta.estimated_weeks_min },
            { label: 'Est. hours', value: totalHours.toLocaleString() },
            { label: 'Hrs/week', value: meta.hours_per_week },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--bg-card)', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 500, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {value}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: 4, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Tracks */}
        <div style={{ marginTop: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {meta.specialisation_tracks.map(t => (
            <span
              key={t.id}
              style={{ fontSize: '12px', color: 'var(--text-2)', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 10px', fontFamily: 'var(--font-mono)' }}
            >
              Track {t.id}: {t.name}
            </span>
          ))}
        </div>
      </div>

      {/* Dependency Graph */}
      <section style={{ marginBottom: '2.5rem' }}>
        <SectionLabel>Dependency graph</SectionLabel>
        <DependencyGraph modules={modules} phases={phases} />
      </section>

      {/* Gantt Chart */}
      <section style={{ marginBottom: '3rem' }}>
        <SectionLabel>Timeline</SectionLabel>
        <GanttChart modules={modules} phases={phases} />
      </section>

      {/* Filtered module grid */}
      <section>
        <SectionLabel>Modules</SectionLabel>
        <FilteredModuleGrid modules={modules} phases={phases} criticalPath={critical_path} />
      </section>

    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}
