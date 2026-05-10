import Link from 'next/link'
import type { Module, Phase } from '@/types/curriculum'

interface Props {
  module: Module
  phase: Phase
}

export default function ModuleCard({ module: m, phase }: Props) {
  return (
    <Link
      href={`/modules/${m.id}`}
      className="module-card"
      style={{
        display: 'block',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${phase.color}`,
        borderRadius: 6,
        padding: '14px 16px',
        textDecoration: 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          fontWeight: 600,
          color: phase.color,
          letterSpacing: '0.04em',
        }}>
          {m.id}
        </span>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {m.critical_path && (
            <span style={{ fontSize: '10px', color: '#92400e', background: '#fef3c7', borderRadius: 3, padding: '1px 6px' }}>
              ⚡ critical
            </span>
          )}
          {m.specialisation_track && (
            <span style={{ fontSize: '10px', color: '#6d28d9', background: '#ede9fe', borderRadius: 3, padding: '1px 6px', fontFamily: 'var(--font-mono)' }}>
              {m.specialisation_track}
            </span>
          )}
        </div>
      </div>

      <h3 style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text)', lineHeight: 1.3, marginBottom: 8 }}>
        {m.name}
      </h3>

      <p style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {m.learning_outcomes[0]}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
        <span>{m.duration_weeks}wk</span>
        <span style={{ color: 'var(--border-mid)' }}>·</span>
        <span>{m.load_hrs_week}h/wk</span>
        <span style={{ marginLeft: 'auto', color: 'var(--text-3)' }}>wk {m.gantt_start_week}–{m.gantt_end_week}</span>
      </div>
    </Link>
  )
}
