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

  const ticks = Array.from(
    { length: Math.ceil(TOTAL_WEEKS / WEEKS_PER_TICK) + 1 },
    (_, i) => i * WEEKS_PER_TICK + 1
  ).filter(w => w <= TOTAL_WEEKS + 1)

  const toPercent = (week: number) => ((week - 1) / TOTAL_WEEKS) * 100

  const sorted = [...modules].sort((a, b) => a.gantt_start_week - b.gantt_start_week || a.phase - b.phase)

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>
          {TOTAL_WEEKS} weeks minimum · click bars to open
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {phases.map(p => (
            <span key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px', color: 'var(--text-3)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: p.color + '50', border: `1px solid ${p.color}80`, display: 'inline-block' }} />
              {p.label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 700, padding: '14px 20px 18px' }}>
          {/* Week ruler */}
          <div style={{ position: 'relative', height: 20, marginBottom: 8 }}>
            {ticks.map(w => (
              <div
                key={w}
                style={{
                  position: 'absolute',
                  left: `${toPercent(w)}%`,
                  top: 0,
                  color: 'var(--text-3)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  transform: 'translateX(-50%)',
                }}
              >
                w{w}
              </div>
            ))}
          </div>

          {/* Grid + bars */}
          <div style={{ position: 'relative' }}>
            {ticks.map(w => (
              <div
                key={w}
                style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: `${toPercent(w)}%`,
                  width: 1, background: 'var(--border)', zIndex: 0,
                }}
              />
            ))}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {sorted.map(m => {
                const color = phaseColorMap[m.phase]
                const left = toPercent(m.gantt_start_week)
                const right = toPercent(m.gantt_end_week + 1)
                const widthPct = right - left

                return (
                  <div key={m.id} style={{ position: 'relative', height: 30 }}>
                    <button
                      onClick={() => router.push(`/modules/${m.id}`)}
                      style={{
                        position: 'absolute',
                        left: `${left}%`,
                        width: `${widthPct}%`,
                        minWidth: 32,
                        top: 1,
                        height: 28,
                        background: color + '25',
                        border: `1px solid ${color}60`,
                        borderLeft: m.critical_path ? `3px solid ${color}` : `1px solid ${color}60`,
                        borderRadius: 4,
                        color: color,
                        padding: '0 7px',
                        cursor: 'pointer',
                        zIndex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        overflow: 'hidden',
                        fontSize: 10,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        transition: 'opacity 0.12s',
                      }}
                      title={`${m.id}: ${m.name} (wk ${m.gantt_start_week}–${m.gantt_end_week})`}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.75' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
                    >
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, opacity: 0.7, flexShrink: 0 }}>{m.id}</span>
                      {widthPct > 8 && (
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.short_name}</span>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
