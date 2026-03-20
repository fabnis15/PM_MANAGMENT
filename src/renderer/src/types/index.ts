export interface Person {
  id: number
  name: string
  role: string
  seniority: 'junior' | 'mid' | 'senior' | 'lead' | 'manager'
  inquadramento: string  // es. "Quadro", "Impiegato B2", "Dirigente"
  appartenenza: string   // es. "Team Backend", "Delivery Italia", "PMO"
  email: string
  hourly_rate: number
  daily_rate: number   // hourly_rate × working_hours_per_day (calcolato e salvato)
  fte: number
  color: string
  created_at: string
}

export interface Project {
  id: number
  name: string
  client: string
  wbs_opx: string       // codice WBS / OPX
  tipo_attivita: string // es. Sviluppo, Consulenza, Manutenzione, Formazione…
  description: string
  start_date: string
  end_date: string
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled'
  budget_total: number
  color: string
  created_at: string
}

export interface Allocation {
  id: number
  person_id: number
  project_id: number
  start_date: string
  end_date: string
  percentage: number
  notes: string
  created_at: string
  // joined
  person_name?: string
  person_color?: string
  daily_rate?: number
  project_name?: string
  project_color?: string
}

export interface Milestone {
  id: number
  project_id: number
  name: string
  due_date: string
  completed: number | boolean
  description: string
  created_at: string
  // joined
  project_name?: string
  project_color?: string
}

export interface Settings {
  overallocation_threshold: number
  budget_warning_threshold: number
  deadline_warning_days: number
  working_days_per_week: number
  working_hours_per_day: number
}

export interface Holiday {
  id: number
  name: string
  date: string        // YYYY-MM-DD (anno di riferimento per le ricorrenti)
  type: 'national' | 'company'
  recurring: number   // 1 = annuale (stesso MM-DD ogni anno)
  active: number      // 1 = attiva
  created_at: string
}

export type LeaveType = 'ferie' | 'permesso' | 'malattia' | 'altro'

export interface Leave {
  id: number
  person_id: number
  start_date: string
  end_date: string
  type: LeaveType
  notes: string
  created_at: string
  // joined
  person_name?: string
  person_color?: string
}

export interface MonthlyRevenue {
  id?: number
  project_id: number
  year: number
  month: number   // 1-12
  stima: number
  revenue: number
  aop: number
  notes: string
  created_at?: string
}

export type AlertSeverity = 'error' | 'warning' | 'info'
export type AlertType = 'overallocation' | 'budget' | 'deadline' | 'milestone'

export interface Alert {
  id: string
  severity: AlertSeverity
  type: AlertType
  title: string
  message: string
  entityId: number
  entityType: 'person' | 'project' | 'milestone'
  date?: string
}

// Window API type
declare global {
  interface Window {
    api: {
      getPeople: () => Promise<Person[]>
      createPerson: (d: Omit<Person, 'id' | 'created_at'>) => Promise<Person>
      updatePerson: (id: number, d: Omit<Person, 'id' | 'created_at'>) => Promise<Person>
      deletePerson: (id: number) => Promise<{ success: boolean }>

      getProjects: () => Promise<Project[]>
      createProject: (d: Omit<Project, 'id' | 'created_at'>) => Promise<Project>
      updateProject: (id: number, d: Omit<Project, 'id' | 'created_at'>) => Promise<Project>
      deleteProject: (id: number) => Promise<{ success: boolean }>

      getAllocations: () => Promise<Allocation[]>
      createAllocation: (d: Omit<Allocation, 'id' | 'created_at' | 'person_name' | 'person_color' | 'project_name' | 'project_color'>) => Promise<Allocation>
      updateAllocation: (id: number, d: Omit<Allocation, 'id' | 'created_at' | 'person_name' | 'person_color' | 'project_name' | 'project_color'>) => Promise<Allocation>
      deleteAllocation: (id: number) => Promise<{ success: boolean }>

      getMilestones: (projectId?: number) => Promise<Milestone[]>
      createMilestone: (d: Omit<Milestone, 'id' | 'created_at' | 'project_name' | 'project_color'>) => Promise<Milestone>
      updateMilestone: (id: number, d: Omit<Milestone, 'id' | 'created_at' | 'project_name' | 'project_color'>) => Promise<Milestone>
      deleteMilestone: (id: number) => Promise<{ success: boolean }>

      getSettings: () => Promise<Settings>
      updateSettings: (d: Partial<Settings>) => Promise<Settings>

      getHolidays: () => Promise<Holiday[]>
      createHoliday: (d: Omit<Holiday, 'id' | 'created_at'>) => Promise<Holiday>
      updateHoliday: (id: number, d: Omit<Holiday, 'id' | 'created_at'>) => Promise<Holiday>
      deleteHoliday: (id: number) => Promise<{ success: boolean }>

      getLeaves: () => Promise<Leave[]>
      createLeave: (d: Omit<Leave, 'id' | 'created_at' | 'person_name' | 'person_color'>) => Promise<Leave>
      updateLeave: (id: number, d: Omit<Leave, 'id' | 'created_at' | 'person_name' | 'person_color'>) => Promise<Leave>
      deleteLeave: (id: number) => Promise<{ success: boolean }>

      getMonthlyRevenues: () => Promise<MonthlyRevenue[]>
      upsertMonthlyRevenue: (d: Omit<MonthlyRevenue, 'id' | 'created_at'>) => Promise<MonthlyRevenue>
      deleteMonthlyRevenue: (projectId: number, year: number, month: number) => Promise<{ success: boolean }>
    }
  }
}
