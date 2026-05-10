'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { useRouter } from 'next/navigation'
import type { Module, Phase } from '@/types/curriculum'

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  label: string
  phase: number
  critical: boolean
  duration: number
  name: string
  track: string | null
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  critical: boolean
}

interface Props {
  modules: Module[]
  phases: Phase[]
}

export default function DependencyGraph({ modules, phases }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const router = useRouter()

  useEffect(() => {
    const el = svgRef.current
    if (!el) return

    const width = el.clientWidth || 900
    const height = 540

    const svg = d3.select(el)
    svg.selectAll('*').remove()

    const phaseColorMap: Record<number, string> = {}
    phases.forEach(p => { phaseColorMap[p.id] = p.color })

    // Arrow markers
    const defs = svg.append('defs')
    defs.append('marker')
      .attr('id', 'arrow-normal')
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 22)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', '#475569')

    defs.append('marker')
      .attr('id', 'arrow-critical')
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 22)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', '#f59e0b')

    const nodes: GraphNode[] = modules.map(m => ({
      id: m.id,
      label: m.short_name,
      phase: m.phase,
      critical: m.critical_path,
      duration: m.duration_weeks,
      name: m.name,
      track: m.specialisation_track,
    }))

    const links: GraphLink[] = []
    modules.forEach(mod => {
      mod.prerequisites.forEach(prereqId => {
        const sourceNode = nodes.find(n => n.id === prereqId)
        const targetNode = nodes.find(n => n.id === mod.id)
        if (sourceNode && targetNode) {
          links.push({
            source: prereqId,
            target: mod.id,
            critical: sourceNode.critical && targetNode.critical,
          })
        }
      })
    })

    const g = svg.append('g')

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 3])
      .on('zoom', e => g.attr('transform', e.transform))
    svg.call(zoom)

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(130)
        .strength(0.6))
      .force('charge', d3.forceManyBody().strength(-450))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<GraphNode>().radius(38))

    const linkSel = g.append('g')
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(links)
      .join('line')
      .attr('class', d => `graph-link${d.critical ? ' critical' : ''}`)
      .attr('marker-end', d => d.critical ? 'url(#arrow-critical)' : 'url(#arrow-normal)')

    const nodeSel = g.append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart()
            d.fx = d.x; d.fy = d.y
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
          .on('end', (event, d) => {
            if (!event.active) sim.alphaTarget(0)
            d.fx = null; d.fy = null
          })
      )
      .on('click', (_, d) => router.push(`/modules/${d.id}`))

    nodeSel.append('circle')
      .attr('r', d => Math.max(22, 18 + d.duration / 3))
      .attr('fill', d => phaseColorMap[d.phase] + '28')
      .attr('stroke', d => phaseColorMap[d.phase])
      .attr('stroke-width', d => d.critical ? 2.5 : 1.5)

    nodeSel.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('fill', '#f1f5f9')
      .attr('pointer-events', 'none')
      .text(d => d.label)

    nodeSel.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-1.6em')
      .attr('font-size', '8px')
      .attr('fill', '#64748b')
      .attr('pointer-events', 'none')
      .attr('font-family', 'monospace')
      .text(d => d.id)

    // Tooltip
    let tooltip = document.querySelector<HTMLDivElement>('.graph-tooltip')
    if (!tooltip) {
      tooltip = document.createElement('div')
      tooltip.className = 'graph-tooltip'
      document.body.appendChild(tooltip)
    }
    tooltip.style.opacity = '0'

    nodeSel
      .on('mouseover', (event, d) => {
        const phase = phases[d.phase]
        const color = phaseColorMap[d.phase]
        tooltip!.innerHTML = `
          <div style="font-family:monospace;font-size:10px;color:${color};margin-bottom:4px">${d.id} · ${phase.label}</div>
          <div style="font-weight:bold;margin-bottom:4px;font-size:13px">${d.name}</div>
          <div style="color:#94a3b8;font-size:11px">${d.duration} weeks${d.critical ? ' · ⚡ Critical' : ''}${d.track ? ` · Track ${d.track}` : ''}</div>
        `
        tooltip!.style.opacity = '1'
      })
      .on('mousemove', event => {
        tooltip!.style.left = (event.clientX + 16) + 'px'
        tooltip!.style.top = (event.clientY - 12) + 'px'
      })
      .on('mouseout', () => { tooltip!.style.opacity = '0' })

    sim.on('tick', () => {
      linkSel
        .attr('x1', d => (d.source as GraphNode).x ?? 0)
        .attr('y1', d => (d.source as GraphNode).y ?? 0)
        .attr('x2', d => (d.target as GraphNode).x ?? 0)
        .attr('y2', d => (d.target as GraphNode).y ?? 0)
      nodeSel.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    return () => {
      sim.stop()
      tooltip?.remove()
    }
  }, [modules, phases, router])

  return (
    <div style={{ background: '#0a1628', border: '1px solid #1e293b', borderRadius: '12px' }} className="overflow-hidden">
      <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid #1e293b' }}>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Dependency Graph
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          drag nodes · scroll to zoom · click to open
        </span>
        <div className="ml-auto flex items-center gap-4">
          {[
            { color: '#6b7280', label: 'Pre-Phase' },
            { color: '#3b82f6', label: 'Phase 1' },
            { color: '#8b5cf6', label: 'Phase 2' },
            { color: '#ec4899', label: 'Phase 3' },
            { color: '#f59e0b', label: 'Phase 4' },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
              {label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="inline-block h-px w-4" style={{ background: '#f59e0b' }} />
            critical path
          </span>
        </div>
      </div>
      <svg ref={svgRef} className="w-full" style={{ height: '520px' }} />
    </div>
  )
}
