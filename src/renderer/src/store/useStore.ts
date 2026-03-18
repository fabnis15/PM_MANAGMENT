import { create } from 'zustand'
import { Person, Project, Allocation, Milestone, Settings, Alert, Holiday, Leave } from '../types'

export function getWorkingDays(
  start: string,
  end: string,
  holidays: Holiday[] = [],
  personLeaves: Leave[] = []
): number {
  const s = new Date(start), e = new Date(end)
  if (s > e) return 0
  let count = 0
  const cur = new Date(s)
  while (cur <= e) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) {
      const mm = cur.getMonth() + 1
      const dd = cur.getDate()
      const dateStr = `${cur.getFullYear()}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`
      const isHoliday = holidays.some(h => {
        if (!h.active) return false
        const hd = new Date(h.date)
        return h.recurring
          ? hd.getMonth() + 1 === mm && hd.getDate() === dd
          : h.date === dateStr
      })
      const onLeave = personLeaves.some(l => dateStr >= l.start_date && dateStr <= l.end_date)
      if (!isHoliday && !onLeave) count++
    }
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function overlapsMonth(a: Allocation, year: number, month: number): boolean {
  const start = new Date(a.start_date)
  const end = new Date(a.end_date)
  const mStart = new Date(year, month, 1)
  const mEnd = new Date(year, month + 1, 0)
  return start <= mEnd && end >= mStart
}

function computeAlerts(
  people: Person[],
  projects: Project[],
  allocations: Allocation[],
  milestones: Milestone[],
  settings: Settings,
  holidays: Holiday[],
  leaves: Leave[]
): Alert[] {
  const alerts: Alert[] = []
  const today = new Date()

  // 1. Overallocation — check next 6 months
  for (const person of people) {
    const pa = allocations.filter(a => a.person_id === person.id)
    if (!pa.length) continue
    for (let i = 0; i < 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
      const year = d.getFullYear(), month = d.getMonth()
      const total = pa.filter(a => overlapsMonth(a, year, month)).reduce((s, a) => s + a.percentage, 0)
      if (total > settings.overallocation_threshold) {
        const label = d.toLocaleString('it-IT', { month: 'long', year: 'numeric' })
        alerts.push({
          id: `overalloc-${person.id}-${year}-${month}`,
          severity: total > 120 ? 'error' : 'warning',
          type: 'overallocation',
          title: `${person.name} sovra-allocato`,
          message: `${total}% allocato in ${label} (soglia: ${settings.overallocation_threshold}%)`,
          entityId: person.id,
          entityType: 'person',
          date: d.toISOString().slice(0, 7)
        })
      }
    }
  }

  // 2. Budget warnings
  for (const project of projects) {
    if (project.status === 'completed' || project.status === 'cancelled') continue
    if (project.budget_total <= 0) continue
    const pa = allocations.filter(a => a.project_id === project.id)
    const estimatedCost = pa.reduce((sum, a) => {
      const person = people.find(p => p.id === a.person_id)
      if (!person) return sum
      const personLeaves = leaves.filter(l => l.person_id === a.person_id)
      return sum + getWorkingDays(a.start_date, a.end_date, holidays, personLeaves) * person.daily_rate * (a.percentage / 100)
    }, 0)
    const pct = (estimatedCost / project.budget_total) * 100
    if (pct >= settings.budget_warning_threshold) {
      alerts.push({
        id: `budget-${project.id}`,
        severity: pct >= 100 ? 'error' : 'warning',
        type: 'budget',
        title: `Budget ${project.name}`,
        message: `Costo stimato €${estimatedCost.toFixed(0)} = ${pct.toFixed(0)}% del budget (€${project.budget_total.toFixed(0)})`,
        entityId: project.id,
        entityType: 'project'
      })
    }
  }

  // 3. Project deadline warnings
  for (const project of projects) {
    if (project.status === 'completed' || project.status === 'cancelled') continue
    const end = new Date(project.end_date)
    const days = Math.ceil((end.getTime() - today.getTime()) / 86400000)
    if (days >= 0 && days <= settings.deadline_warning_days) {
      alerts.push({
        id: `deadline-proj-${project.id}`,
        severity: days <= 3 ? 'error' : 'warning',
        type: 'deadline',
        title: `Scadenza progetto: ${project.name}`,
        message: `Il progetto termina tra ${days} giorn${days !== 1 ? 'i' : 'o'}`,
        entityId: project.id,
        entityType: 'project',
        date: project.end_date
      })
    }
  }

  // 4. Milestone warnings
  for (const ms of milestones) {
    if (ms.completed) continue
    const due = new Date(ms.due_date)
    const days = Math.ceil((due.getTime() - today.getTime()) / 86400000)
    if (days >= 0 && days <= settings.deadline_warning_days) {
      alerts.push({
        id: `milestone-${ms.id}`,
        severity: days <= 3 ? 'error' : 'warning',
        type: 'milestone',
        title: `Milestone in scadenza`,
        message: `"${ms.name}" (${ms.project_name}) tra ${days} giorn${days !== 1 ? 'i' : 'o'}`,
        entityId: ms.id,
        entityType: 'milestone',
        date: ms.due_date
      })
    }
  }

  return alerts.sort((a, b) => {
    const order = { error: 0, warning: 1, info: 2 }
    return order[a.severity] - order[b.severity]
  })
}

const defaultSettings: Settings = {
  overallocation_threshold: 100,
  budget_warning_threshold: 80,
  deadline_warning_days: 14,
  working_days_per_week: 5,
  working_hours_per_day: 8
}

interface Store {
  people: Person[]
  projects: Project[]
  allocations: Allocation[]
  milestones: Milestone[]
  settings: Settings
  holidays: Holiday[]
  leaves: Leave[]
  alerts: Alert[]
  loading: boolean

  loadAll: () => Promise<void>
  refreshAlerts: () => void

  createHoliday: (d: Omit<Holiday, 'id' | 'created_at'>) => Promise<void>
  updateHoliday: (id: number, d: Omit<Holiday, 'id' | 'created_at'>) => Promise<void>
  deleteHoliday: (id: number) => Promise<void>

  createLeave: (d: Omit<Leave, 'id' | 'created_at' | 'person_name' | 'person_color'>) => Promise<void>
  updateLeave: (id: number, d: Omit<Leave, 'id' | 'created_at' | 'person_name' | 'person_color'>) => Promise<void>
  deleteLeave: (id: number) => Promise<void>

  createPerson: (d: Omit<Person, 'id' | 'created_at'>) => Promise<void>
  updatePerson: (id: number, d: Omit<Person, 'id' | 'created_at'>) => Promise<void>
  deletePerson: (id: number) => Promise<void>

  createProject: (d: Omit<Project, 'id' | 'created_at'>) => Promise<void>
  updateProject: (id: number, d: Omit<Project, 'id' | 'created_at'>) => Promise<void>
  deleteProject: (id: number) => Promise<void>

  createAllocation: (d: Omit<Allocation, 'id' | 'created_at' | 'person_name' | 'person_color' | 'project_name' | 'project_color'>) => Promise<void>
  updateAllocation: (id: number, d: Omit<Allocation, 'id' | 'created_at' | 'person_name' | 'person_color' | 'project_name' | 'project_color'>) => Promise<void>
  deleteAllocation: (id: number) => Promise<void>

  createMilestone: (d: Omit<Milestone, 'id' | 'created_at' | 'project_name' | 'project_color'>) => Promise<void>
  updateMilestone: (id: number, d: Omit<Milestone, 'id' | 'created_at' | 'project_name' | 'project_color'>) => Promise<void>
  deleteMilestone: (id: number) => Promise<void>

  saveSettings: (d: Partial<Settings>) => Promise<void>
}

export const useStore = create<Store>((set, get) => ({
  people: [],
  projects: [],
  allocations: [],
  milestones: [],
  settings: defaultSettings,
  holidays: [],
  leaves: [],
  alerts: [],
  loading: false,

  refreshAlerts: () => {
    const { people, projects, allocations, milestones, settings, holidays, leaves } = get()
    set({ alerts: computeAlerts(people, projects, allocations, milestones, settings, holidays, leaves) })
  },

  loadAll: async () => {
    set({ loading: true })
    const [people, projects, allocations, milestones, settings, holidays, leaves] = await Promise.all([
      window.api.getPeople(),
      window.api.getProjects(),
      window.api.getAllocations(),
      window.api.getMilestones(),
      window.api.getSettings(),
      window.api.getHolidays(),
      window.api.getLeaves(),
    ])
    const s = settings as unknown as Settings
    const alerts = computeAlerts(people, projects, allocations, milestones, s, holidays, leaves)
    set({ people, projects, allocations, milestones, settings: s, holidays, leaves, alerts, loading: false })
  },

  // ── People
  createPerson: async (d) => {
    const p = await window.api.createPerson(d)
    set(s => ({ people: [...s.people, p] }))
    get().refreshAlerts()
  },
  updatePerson: async (id, d) => {
    const p = await window.api.updatePerson(id, d)
    set(s => ({ people: s.people.map(x => x.id === id ? p : x) }))
    get().refreshAlerts()
  },
  deletePerson: async (id) => {
    await window.api.deletePerson(id)
    set(s => ({
      people: s.people.filter(x => x.id !== id),
      allocations: s.allocations.filter(a => a.person_id !== id)
    }))
    get().refreshAlerts()
  },

  // ── Projects
  createProject: async (d) => {
    const p = await window.api.createProject(d)
    set(s => ({ projects: [p, ...s.projects] }))
    get().refreshAlerts()
  },
  updateProject: async (id, d) => {
    const p = await window.api.updateProject(id, d)
    set(s => ({ projects: s.projects.map(x => x.id === id ? p : x) }))
    get().refreshAlerts()
  },
  deleteProject: async (id) => {
    await window.api.deleteProject(id)
    set(s => ({
      projects: s.projects.filter(x => x.id !== id),
      allocations: s.allocations.filter(a => a.project_id !== id),
      milestones: s.milestones.filter(m => m.project_id !== id)
    }))
    get().refreshAlerts()
  },

  // ── Allocations
  createAllocation: async (d) => {
    const a = await window.api.createAllocation(d)
    set(s => ({ allocations: [...s.allocations, a] }))
    get().refreshAlerts()
  },
  updateAllocation: async (id, d) => {
    const a = await window.api.updateAllocation(id, d)
    set(s => ({ allocations: s.allocations.map(x => x.id === id ? a : x) }))
    get().refreshAlerts()
  },
  deleteAllocation: async (id) => {
    await window.api.deleteAllocation(id)
    set(s => ({ allocations: s.allocations.filter(x => x.id !== id) }))
    get().refreshAlerts()
  },

  // ── Milestones
  createMilestone: async (d) => {
    const m = await window.api.createMilestone(d)
    set(s => ({ milestones: [...s.milestones, m] }))
    get().refreshAlerts()
  },
  updateMilestone: async (id, d) => {
    const m = await window.api.updateMilestone(id, d)
    set(s => ({ milestones: s.milestones.map(x => x.id === id ? m : x) }))
    get().refreshAlerts()
  },
  deleteMilestone: async (id) => {
    await window.api.deleteMilestone(id)
    set(s => ({ milestones: s.milestones.filter(x => x.id !== id) }))
    get().refreshAlerts()
  },

  // ── Settings
  saveSettings: async (d) => {
    const s = await window.api.updateSettings(d)
    set({ settings: s as unknown as Settings })
    get().refreshAlerts()
  },

  // ── Holidays
  createHoliday: async (d) => {
    const h = await window.api.createHoliday(d)
    set(s => ({ holidays: [...s.holidays, h] }))
    get().refreshAlerts()
  },
  updateHoliday: async (id, d) => {
    const h = await window.api.updateHoliday(id, d)
    set(s => ({ holidays: s.holidays.map(x => x.id === id ? h : x) }))
    get().refreshAlerts()
  },
  deleteHoliday: async (id) => {
    await window.api.deleteHoliday(id)
    set(s => ({ holidays: s.holidays.filter(x => x.id !== id) }))
    get().refreshAlerts()
  },

  // ── Leaves
  createLeave: async (d) => {
    const l = await window.api.createLeave(d)
    set(s => ({ leaves: [...s.leaves, l] }))
    get().refreshAlerts()
  },
  updateLeave: async (id, d) => {
    const l = await window.api.updateLeave(id, d)
    set(s => ({ leaves: s.leaves.map(x => x.id === id ? l : x) }))
    get().refreshAlerts()
  },
  deleteLeave: async (id) => {
    await window.api.deleteLeave(id)
    set(s => ({ leaves: s.leaves.filter(x => x.id !== id) }))
    get().refreshAlerts()
  },
}))
