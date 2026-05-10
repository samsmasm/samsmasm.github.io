import data from '@/data/modules.json'
import type { CurriculumData, Module, Phase } from '@/types/curriculum'

export const curriculum = data as unknown as CurriculumData

export function getModule(id: string): Module | undefined {
  return curriculum.modules.find(m => m.id === id)
}

export function getModulesByPhase(phase: number): Module[] {
  return curriculum.modules.filter(m => m.phase === phase)
}

export function getPhase(id: number): Phase | undefined {
  return curriculum.phases.find(p => p.id === id)
}

export function getPhaseColor(phaseId: number): string {
  const phase = getPhase(phaseId)
  return phase?.color ?? '#6b7280'
}
