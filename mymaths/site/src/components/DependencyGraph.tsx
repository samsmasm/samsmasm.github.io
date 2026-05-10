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
    const height = 520

    const svg = d3.select(el)
    svg.selectAll('*').remove()

    const phaseColorMap: Record<number, string> = {}
    phases.forEach(p => { phaseColorMap[p.id] = p.color })

    const defs = svg.append('defs')
    defs.append('marker')
      .attr('id', 'arrow-normal')
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 24)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', '#cdc8be')

    defs.append('marker')
      .attr('id', 'arrow-critical')
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 24)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', '#d97706')

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
      .attr('fill', d => phaseColorMap[d.phase] + '18')
      .attr('stroke', d => phaseColorMap[d.phase])
      .attr('stroke-width', d => d.critical ? 2.5 : 1.5)

    nodeSel.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('fill', '#1a1714')
      .attr('pointer-events', 'none')
      .text(d => d.label)

    nodeSel.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-1.6em')
      .attr('font-size', '8px')
      .attr('fill', '#a09890')
      .attr('pointer-events', 'none')
      .attr('font-family', 'monospace')
      .text(d => d.id)

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
          <div style="font-family:monospace;font-size:9px;color:${color};margin-bottom:4px;letter-spacing:0.06em;text-transform:uppercase">${d.id} · ${phase.label}</div>
          <div style="font-weight:600;margin-bottom:4px;font-size:13px">${d.name}</div>
          <div style="color:#a09890;font-size:11px">${d.duration} weeks${d.critical ? ' · ⚡ Critical' : ''}${d.track ? ` · Track ${d.track}` : ''}</div>
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
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>Drag · scroll to zoom · click to open</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {phases.map(p => (
            <span key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '11px', color: 'var(--text-3)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
              {p.label}
            </span>
          ))}
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '11px', color: 'var(--text-3)' }}>
            <span style={{ display: 'inline-block', height: 2, width: 14, background: '#d97706' }} />
            critical
          </span>
        </div>
      </div>
      <svg ref={svgRef} className="w-full" style={{ height: 520, background: 'var(--bg)' }} />
    </div>
  )
}
