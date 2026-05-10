'use client'

import { useState } from 'react'
import type { LODetail } from '@/types/curriculum'

interface Props {
  outcomes: string[]
  detail?: LODetail[]
  phaseColor: string
}

export default function LearningOutcomes({ outcomes, detail, phaseColor }: Props) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <ol style={{ display: 'flex', flexDirection: 'column', gap: 10, listStyle: 'none', padding: 0, margin: 0 }}>
      {outcomes.map((lo, i) => {
        const hasDetail = detail && detail[i] && detail[i].subtopics.length > 0
        const isOpen = open === i

        return (
          <li key={i}>
            <div
              style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}
            >
              <span style={{
                flexShrink: 0, width: 24, height: 24, borderRadius: '50%',
                background: phaseColor + '18', border: `1px solid ${phaseColor}50`,
                color: phaseColor, fontSize: 'var(--text-2xs)', fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: 2, fontFamily: 'var(--font-mono)',
              }}>
                {i + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 'var(--text-sm)', lineHeight: 1.6, color: 'var(--text)' }}>{lo}</span>
                  {hasDetail && (
                    <button
                      onClick={() => setOpen(isOpen ? null : i)}
                      style={{
                        flexShrink: 0,
                        marginTop: 2,
                        padding: '2px 9px',
                        borderRadius: 4,
                        border: `1px solid ${isOpen ? phaseColor + '60' : 'var(--border)'}`,
                        background: isOpen ? phaseColor + '12' : 'var(--bg-subtle)',
                        color: isOpen ? phaseColor : 'var(--text-3)',
                        fontSize: 'var(--text-2xs)',
                        fontFamily: 'var(--font-mono)',
                        cursor: 'pointer',
                        lineHeight: 1.5,
                        transition: 'all 0.15s',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isOpen ? '▲ collapse' : '▼ expand'}
                    </button>
                  )}
                </div>

                {hasDetail && isOpen && (
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {detail![i].subtopics.map((sub, j) => (
                      <div
                        key={j}
                        style={{
                          paddingLeft: 14,
                          borderLeft: `2px solid ${phaseColor}30`,
                        }}
                      >
                        <div style={{
                          fontSize: 'var(--text-sm)', fontWeight: 600,
                          color: 'var(--text)', marginBottom: 5,
                        }}>
                          {sub.name}
                        </div>
                        <p style={{
                          fontSize: 'var(--text-xs)', lineHeight: 1.65,
                          color: 'var(--text-2)', margin: '0 0 10px',
                        }}>
                          {sub.description}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {sub.examples.map((ex, k) => (
                            <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                              <span style={{
                                flexShrink: 0,
                                fontSize: 'var(--text-2xs)',
                                fontFamily: 'var(--font-mono)',
                                color: phaseColor,
                                marginTop: 2,
                                opacity: 0.7,
                              }}>
                                eg.
                              </span>
                              <span style={{
                                fontSize: 'var(--text-xs)', lineHeight: 1.55,
                                color: 'var(--text-2)', fontStyle: 'italic',
                              }}>
                                {ex}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
