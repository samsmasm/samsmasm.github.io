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
  const totalCount = filtered.length

  return (
    <div>
      {/* Filter bar */}
      <div
        className="mb-8 pb-5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex flex-wrap gap-y-3 gap-x-6 items-start">
          {/* Phase */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span style={{ fontSize: '11px', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginRight: 4 }}>
              Phase
            </span>
            <button
              className={`filter-pill${phaseFilter === 'all' ? ' active' : ''}`}
              onClick={() => setPhaseFilter('all')}
            >
              All
            </button>
            {phases.map(p => (
              <button
                key={p.id}
                onClick={() => setPhaseFilter(p.id)}
                className="filter-pill"
                style={phaseFilter === p.id ? {
                  background: p.color,
                  borderColor: p.color,
                  color: '#fff',
                } : {}}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: p.color, opacity: phaseFilter === p.id ? 0.7 : 1 }}
                />
                {p.label}
              </button>
            ))}
          </div>

          {/* Track */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span style={{ fontSize: '11px', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginRight: 4 }}>
              Track
            </span>
            {([
              { value: 'all', label: 'All' },
              { value: 'core', label: 'Core only' },
              { value: 'A', label: 'A · Finance' },
              { value: 'B', label: 'B · ML Theory' },
            ] as { value: TrackFilter; label: string }[]).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setTrackFilter(value)}
                className={`filter-pill${trackFilter === value ? ' active' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Critical path toggle */}
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: '11px', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
              Path
            </span>
            <button
              onClick={() => setCriticalOnly(!criticalOnly)}
              className="filter-pill"
              style={criticalOnly ? {
                background: '#d97706',
                borderColor: '#d97706',
                color: '#fff',
              } : {}}
            >
              ⚡ Critical only
            </button>
          </div>

          {/* Count */}
          <span
            className="ml-auto self-center"
            style={{ fontSize: '13px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}
          >
            {totalCount} / {modules.length}
          </span>
        </div>
      </div>

      {/* Module sections by phase */}
      {visiblePhases.map(phase => {
        const phaseModules = filtered.filter(m => m.phase === phase.id)
        return (
          <section key={phase.id} className="mb-12">
            <div className="flex items-center gap-4 mb-2">
              <div style={{ width: 3, height: 28, background: phase.color, borderRadius: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '11px', letterSpacing: '0.1em', color: phase.color, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 1 }}>
                  {phase.label}
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>
                  {phase.name}
                </h2>
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text-3)', marginLeft: 8 }}>
                ~{phase.duration_months_approx} months
              </span>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-2)', maxWidth: '60ch', marginBottom: '1.25rem', marginLeft: 19, paddingLeft: 12, borderLeft: `1px solid ${phase.color}40` }}>
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

      {filtered.length === 0 && (
        <div className="py-16 text-center" style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>
          No modules match the current filters.
        </div>
      )}

      {/* Critical path sequence */}
      <section
        className="rounded-lg p-5 mb-6"
        style={{ background: '#fffbeb', border: '1px solid #fde68a' }}
      >
        <h2 style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#92400e', marginBottom: 12 }}>
          ⚡ Critical Path — Pure Analysis Track
        </h2>
        <div className="flex flex-wrap items-center gap-1.5">
          {criticalPath.pure_analysis_track.map((id, i) => (
            <span key={id} className="flex items-center gap-1.5">
              <Link
                href={`/modules/${id}`}
                className="text-sm font-mono px-2 py-0.5 rounded transition-opacity hover:opacity-70"
                style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}
              >
                {id}
              </Link>
              {i < criticalPath.pure_analysis_track.length - 1 && (
                <span style={{ color: '#d97706', fontSize: 12 }}>→</span>
              )}
            </span>
          ))}
        </div>
        <p style={{ fontSize: '12px', color: '#a16207', marginTop: 10 }}>
          Bottlenecks: {criticalPath.bottleneck_modules.join(', ')}
        </p>
      </section>
    </div>
  )
}
