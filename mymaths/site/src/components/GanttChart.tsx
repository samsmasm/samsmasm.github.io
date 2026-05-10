'use client'

import { useRouter } from 'next/navigation'
import type { Module, Phase } from '@/types/curriculum'

interface Props {
  modules: Module[]
  phases: Phase[]
}

const TOTAL_WEEKS = 88
const WEEKS_PER_TICK = 8

export default function GanttChart({ modules, phases }: Props) {
  const router = useRouter()

  const phaseColorMap: Record<number, string> = {}
  phases.forEach(p => { phaseColorMap[p.id] = p.color })

  const ticks = Array.from({ length: Math.ceil(TOTAL_WEEKS / WEEKS_PER_TICK) + 1 }, (_, i) => i * WEEKS_PER_TICK + 1).filter(w => w <= TOTAL_WEEKS + 1)

  const toPercent = (week: number) => ((week - 1) / TOTAL_WEEKS) * 100

  // Sort modules by gantt_start_week then phase
  const sorted = [...modules].sort((a, b) => a.gantt_start_week - b.gantt_start_week || a.phase - b.phase)

  return (
    <div style={{ background: '#0a1628', border: '1px solid #1e293b', borderRadius: '12px' }} className="overflow-hidden">
      <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid #1e293b' }}>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Gantt Timeline
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {TOTAL_WEEKS} weeks minimum · click bars to open module
        </span>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: '700px', padding: '16px 20px 20px' }}>
          {/* Week ruler */}
          <div className="relative mb-3" style={{ height: '20px' }}>
            <div className="absolute inset-0" style={{ borderBottom: '1px solid #1e293b' }} />
            {ticks.map(w => (
              <div
                key={w}
                className="absolute text-xs"
                style={{
                  left: `${toPercent(w)}%`,
                  top: 0,
                  color: '#475569',
                  fontFamily: 'monospace',
                  fontSize: '10px',
                  transform: 'translateX(-50%)',
                }}
              >
                w{w}
              </div>
            ))}
          </div>

          {/* Grid lines */}
          <div className="relative">
            {ticks.map(w => (
              <div
                key={w}
                className="absolute top-0 bottom-0"
                style={{
                  left: `${toPercent(w)}%`,
                  width: '1px',
                  background: '#1e293b',
                  zIndex: 0,
                }}
              />
            ))}

            {/* Module rows */}
            <div className="flex flex-col gap-1.5">
              {sorted.map(m => {
                const color = phaseColorMap[m.phase]
                const left = toPercent(m.gantt_start_week)
                const right = toPercent(m.gantt_end_week + 1)
                const widthPct = right - left

                return (
                  <div key={m.id} className="relative" style={{ height: '32px' }}>
                    <button
                      onClick={() => router.push(`/modules/${m.id}`)}
                      className="absolute flex items-center gap-1.5 text-xs font-semibold rounded overflow-hidden transition-opacity hover:opacity-80"
                      style={{
                        left: `${left}%`,
                        width: `${widthPct}%`,
                        minWidth: '36px',
                        top: '2px',
                        height: '28px',
                        background: color + '30',
                        border: `1px solid ${color}50`,
                        borderLeft: m.critical_path ? `3px solid ${color}` : `1px solid ${color}50`,
                        color,
                        padding: '0 8px',
                        cursor: 'pointer',
                        zIndex: 1,
                        whiteSpace: 'nowrap',
                      }}
                      title={`${m.id}: ${m.name} (wk ${m.gantt_start_week}–${m.gantt_end_week})`}
                    >
                      <span className="font-mono text-[9px] opacity-70 shrink-0">{m.id}</span>
                      {widthPct > 8 && (
                        <span className="truncate text-[10px]">{m.short_name}</span>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Phase legend */}
          <div className="flex items-center gap-5 mt-4 pt-3" style={{ borderTop: '1px solid #1e293b' }}>
            {phases.map(p => (
              <span key={p.id} className="flex items-center gap-1.5 text-xs" style={{ color: '#475569' }}>
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: p.color + '40', border: `1px solid ${p.color}60` }} />
                <span style={{ color: p.color }}>{p.label}</span>
                <span>{p.name}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
