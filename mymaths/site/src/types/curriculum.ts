export interface LOSubtopic {
  name: string
  description: string
  examples: string[]
}

export interface LODetail {
  subtopics: LOSubtopic[]
}

export interface Resource {
  type: 'text' | 'video' | 'exercises' | 'interactive' | 'tool' | 'advanced' | 'theory'
  role: 'primary' | 'alternative' | 'supplementary' | 'solutions' | 'environment' | 'advanced' | 'theory'
  title: string
  author?: string
  url: string
  free: boolean
}

export interface Module {
  id: string
  phase: number
  name: string
  short_name: string
  duration_weeks: number
  load_hrs_week: number
  critical_path: boolean
  specialisation_track: string | null
  gantt_start_week: number
  gantt_end_week: number
  prerequisites: string[]
  unlocks: string[]
  description: string
  why_it_matters: string
  university_equivalents: string[]
  learning_outcomes: string[]
  lo_detail?: LODetail[]
  milestone: string
  ai_integration: string
  resources: Resource[]
}

export interface Phase {
  id: number
  label: string
  name: string
  goal: string
  color: string
  duration_months_approx: number
}

export interface SpecialisationTrack {
  id: string
  name: string
}

export interface Meta {
  title: string
  subtitle: string
  version: string
  total_modules: number
  total_phases: number
  estimated_weeks_min: number
  estimated_weeks_max: number
  hours_per_week: number
  starting_point: string
  end_goal: string
  specialisation_tracks: SpecialisationTrack[]
}

export interface CriticalPath {
  pure_analysis_track: string[]
  applied_ml_track: string[]
  bottleneck_modules: string[]
  safe_to_delay: string[]
}

export interface CurriculumData {
  meta: Meta
  phases: Phase[]
  modules: Module[]
  critical_path: CriticalPath
  phase_milestones: Record<string, string[]>
}
