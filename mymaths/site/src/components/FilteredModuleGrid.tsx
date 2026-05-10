'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Module, Phase, CriticalPath } from '@/types/curriculum'
import ModuleCard from './ModuleCard'

interface Props {
  modules: Module[]
  phases: Phase[]
  criticalPath: CriticalPath
}

type PhaseFilter = number | 'all'
type TrackFilter = 'all' | 'A' | 'B' | 'core'

export default function FilteredModuleGrid({ modules, phases, criticalPath }: Props) {
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all')
  const [trackFilter, setTrackFilter] = useState<TrackFilter>('all')
  const [criticalOnly, setCriticalOnly] = useState(false)

  const filtered = useMemo(() => {
    return modules.filter(m => {
      if (phaseFilter !== 'all' && m.phase !== phaseFilter) return false
      if (trackFilter === 'A' && m.specialisation_track !== 'A') return false
      if (trackFilter === 'B' && m.specialisation_track !== 'B') return false
      if (trackFilter === 'core' && m.specialisation_track !== null) return false
      if (criticalOnly && !m.critical_path) return false
      return true
    })
  }, [modules, phaseFilter, trackFilter, criticalOnly])

  const visiblePhases = phases.filter(p => filtered.some(m => m.phase === p.id))

  return (
    <div>
      {/* Filter bar */}
      <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem 2rem', alignItems: 'flex-start' }}>

          {/* Phase */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-2xs)', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginRight: 2 }}>
              Phase
            </span>
            <button className={`filter-pill${phaseFilter === 'all' ? ' active' : ''}`} onClick={() => setPhaseFilter('all')}>
              All
            </button>
            {phases.map(p => (
              <button
                key={p.id}
                onClick={() => setPhaseFilter(p.id)}
                className="filter-pill"
                style={phaseFilter === p.id ? { background: p.color, borderColor: p.color, color: '#fff' } : {}}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block', opacity: phaseFilter === p.id ? 0.7 : 1 }} />
                {p.label}
              </button>
            ))}
          </div>

          {/* Track */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-2xs)', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginRight: 2 }}>
              Track
            </span>
            {([
              { value: 'all', label: 'All' },
              { value: 'core', label: 'Core only' },
              { value: 'A', label: 'A · Finance' },
              { value: 'B', label: 'B · ML Theory' },
            ] as { value: TrackFilter; label: string }[]).map(({ value, label }) => (
              <button key={value} onClick={() => setTrackFilter(value)} className={`filter-pill${trackFilter === value ? ' active' : ''}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Critical path */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 'var(--text-2xs)', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
              Path
            </span>
            <button
              onClick={() => setCriticalOnly(!criticalOnly)}
              className="filter-pill"
              style={criticalOnly ? { background: '#d97706', borderColor: '#d97706', color: '#fff' } : {}}
            >
              ⚡ Critical only
            </button>
          </div>

          {/* Count */}
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginLeft: 'auto', alignSelf: 'center' }}>
            {filtered.length} / {modules.length}
          </span>
        </div>
      </div>

      {/* Module sections by phase */}
      {visiblePhases.map(phase => {
        const phaseModules = filtered.filter(m => m.phase === phase.id)
        return (
          <section key={phase.id} style={{ marginBottom: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
              <div style={{ width: 3, height: 30, background: phase.color, borderRadius: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 'var(--text-2xs)', letterSpacing: '0.1em', color: phase.color, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 2 }}>
                  {phase.label}
                </div>
                <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>
                  {phase.name}
                </h2>
              </div>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)', marginLeft: 4 }}>
                ~{phase.duration_months_approx} months
              </span>
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', maxWidth: '62ch', marginBottom: '1.25rem', marginLeft: 19, paddingLeft: 12, borderLeft: `1px solid ${phase.color}40` }}>
              {phase.goal}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {phaseModules.map(m => (
                <ModuleCard key={m.id} module={m} phase={phase} />
              ))}
            </div>
          </section>
        )
      })}

      {filtered.length === 0 && (
        <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-3)', fontStyle: 'italic', fontSize: 'var(--text-base)' }}>
          No modules match the current filters.
        </div>
      )}

      {/* Critical path */}
      <section style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: 'var(--text-2xs)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#92400e', marginBottom: 12 }}>
          ⚡ Critical Path — Pure Analysis Track
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          {criticalPath.pure_analysis_track.map((id, i) => (
            <span key={id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Link
                href={`/modules/${id}`}
                style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 4, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', textDecoration: 'none' }}
              >
                {id}
              </Link>
              {i < criticalPath.pure_analysis_track.length - 1 && (
                <span style={{ color: '#d97706', fontSize: 'var(--text-xs)' }}>→</span>
              )}
            </span>
          ))}
        </div>
        <p style={{ fontSize: 'var(--text-xs)', color: '#a16207', marginTop: 10 }}>
          Bottlenecks: {criticalPath.bottleneck_modules.join(', ')}
        </p>
      </section>
    </div>
  )
}
