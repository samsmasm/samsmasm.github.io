import Link from 'next/link'
import type { Module, Phase } from '@/types/curriculum'

interface Props {
  module: Module
  phase: Phase
}

const TRACK_LABEL: Record<string, string> = {
  A: 'Finance',
  B: 'ML Theory',
}

export default function ModuleCard({ module: m, phase }: Props) {
  return (
    <Link
      href={`/modules/${m.id}`}
      className="block rounded-xl p-4 transition-all hover:scale-[1.02]"
      style={{
        background: '#0f172a',
        border: `1px solid ${phase.color}30`,
        borderLeft: `3px solid ${phase.color}`,
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className="text-xs font-mono font-bold px-1.5 py-0.5 rounded"
          style={{ background: phase.color + '20', color: phase.color }}
        >
          {m.id}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {m.critical_path && (
            <span
              className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{ background: '#f59e0b20', color: '#f59e0b' }}
            >
              ⚡ Critical
            </span>
          )}
          {m.specialisation_track && (
            <span
              className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{ background: '#8b5cf620', color: '#8b5cf6' }}
            >
              Track {m.specialisation_track}: {TRACK_LABEL[m.specialisation_track]}
            </span>
          )}
        </div>
      </div>

      <h3 className="font-semibold text-sm leading-snug mb-1" style={{ color: '#f1f5f9', fontFamily: 'Georgia, serif' }}>
        {m.name}
      </h3>

      <p className="text-xs leading-relaxed mb-3 line-clamp-2" style={{ color: '#64748b' }}>
        {m.learning_outcomes[0]}
      </p>

      <div className="flex items-center gap-3 text-xs" style={{ color: '#475569' }}>
        <span>{m.duration_weeks} weeks</span>
        <span>·</span>
        <span>{m.load_hrs_week} hrs/wk</span>
        <span className="ml-auto" style={{ color: '#334155' }}>
          Wk {m.gantt_start_week}–{m.gantt_end_week}
        </span>
      </div>
    </Link>
  )
}
