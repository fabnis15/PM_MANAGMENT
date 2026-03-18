import { useState, useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { Project, Milestone } from '../../types'
import Modal from '../ui/Modal'
import ProjectForm from './ProjectForm'
import MilestoneForm from './MilestoneForm'
import {
  Plus, Pencil, Trash2, CheckCircle2, Circle, ChevronDown, ChevronUp, Flag
} from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-violet-500/20 text-violet-400',
  active: 'bg-emerald-500/20 text-emerald-400',
  'on-hold': 'bg-amber-500/20 text-amber-400',
  completed: 'bg-blue-500/20 text-blue-400',
  cancelled: 'bg-slate-500/20 text-slate-400',
}
const STATUS_LABELS: Record<string, string> = {
  planning: 'Pianificazione', active: 'Attivo', 'on-hold': 'In pausa',
  completed: 'Completato', cancelled: 'Annullato'
}

export default function ProjectsPage() {
  const { projects, milestones, allocations, people, createProject, updateProject, deleteProject,
    createMilestone, updateMilestone, deleteMilestone } = useStore()

  const [filter, setFilter] = useState('all')
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [showNewProject, setShowNewProject] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [editMilestone, setEditMilestone] = useState<Milestone | null>(null)
  const [newMilestoneProjectId, setNewMilestoneProjectId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const filtered = useMemo(() =>
    filter === 'all' ? projects : projects.filter(p => p.status === filter),
    [projects, filter]
  )

  const getEstimatedCost = (projectId: number) => {
    const pa = allocations.filter(a => a.project_id === projectId)
    return pa.reduce((sum, a) => {
      const person = people.find(p => p.id === a.person_id)
      if (!person) return sum
      const days = Math.max(0, Math.ceil(differenceInDays(parseISO(a.end_date), parseISO(a.start_date)) * 5 / 7))
      return sum + days * person.daily_rate * (a.percentage / 100)
    }, 0)
  }

  const statuses = ['all', 'planning', 'active', 'on-hold', 'completed', 'cancelled']

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Progetti</h1>
          <p className="text-sm text-slate-400">{projects.length} progetti totali</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNewProject(true)}>
          <Plus size={16} /> Nuovo progetto
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-800 p-1 rounded-lg w-fit">
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === s ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {s === 'all' ? 'Tutti' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Projects list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="card text-center py-12 text-slate-500">
            <Flag size={32} className="mx-auto mb-3 opacity-30" />
            <p>Nessun progetto trovato</p>
          </div>
        )}
        {filtered.map(project => {
          const pMilestones = milestones.filter(m => m.project_id === project.id)
          const completedMs = pMilestones.filter(m => m.completed).length
          const estimatedCost = getEstimatedCost(project.id)
          const budgetPct = project.budget_total > 0 ? (estimatedCost / project.budget_total) * 100 : 0
          const daysLeft = differenceInDays(parseISO(project.end_date), new Date())
          const isExpanded = expandedId === project.id

          return (
            <div key={project.id} className="card p-0 overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: project.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-white truncate">{project.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[project.status]}`}>
                      {STATUS_LABELS[project.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {project.client && <span className="text-xs text-slate-400">{project.client}</span>}
                    {project.wbs_opx && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
                        {project.wbs_opx}
                      </span>
                    )}
                    {project.tipo_attivita && (
                      <span className="text-xs text-slate-500">{project.tipo_attivita}</span>
                    )}
                  </div>
                </div>

                {/* Meta */}
                <div className="hidden lg:flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="text-slate-400 text-xs">Periodo</div>
                    <div className="text-slate-300 text-xs mt-0.5">
                      {format(parseISO(project.start_date), 'dd/MM/yy')} → {format(parseISO(project.end_date), 'dd/MM/yy')}
                    </div>
                  </div>
                  {project.budget_total > 0 && (
                    <div className="text-center min-w-[90px]">
                      <div className="text-slate-400 text-xs">Budget</div>
                      <div className="text-xs mt-0.5">
                        <span className={budgetPct >= 100 ? 'text-red-400' : budgetPct >= 80 ? 'text-amber-400' : 'text-slate-300'}>
                          {budgetPct.toFixed(0)}%
                        </span>
                        <span className="text-slate-500 ml-1">€{project.budget_total.toLocaleString('it-IT')}</span>
                      </div>
                      <div className="h-1 bg-slate-700 rounded mt-1 w-20">
                        <div className={`h-1 rounded transition-all ${budgetPct >= 100 ? 'bg-red-500' : budgetPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(budgetPct, 100)}%` }} />
                      </div>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-slate-400 text-xs">Milestone</div>
                    <div className="text-slate-300 text-xs mt-0.5">{completedMs}/{pMilestones.length}</div>
                  </div>
                  {project.status === 'active' && (
                    <div className="text-center">
                      <div className="text-slate-400 text-xs">Scadenza</div>
                      <div className={`text-xs mt-0.5 ${daysLeft < 0 ? 'text-red-400' : daysLeft <= 7 ? 'text-amber-400' : 'text-slate-300'}`}>
                        {daysLeft < 0 ? `${Math.abs(daysLeft)}gg fa` : `${daysLeft}gg`}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 ml-2">
                  <button className="btn-ghost p-1.5" onClick={() => setEditProject(project)} title="Modifica">
                    <Pencil size={14} />
                  </button>
                  <button className="btn-danger p-1.5" onClick={() => setConfirmDelete(project.id)} title="Elimina">
                    <Trash2 size={14} />
                  </button>
                  <button className="btn-ghost p-1.5 ml-1"
                    onClick={() => setExpandedId(isExpanded ? null : project.id)}>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Expanded: milestones */}
              {isExpanded && (
                <div className="border-t border-slate-700 px-5 py-4">
                  {project.description && (
                    <p className="text-sm text-slate-400 mb-4">{project.description}</p>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Milestone</span>
                    <button className="btn-ghost text-xs py-1 px-2"
                      onClick={() => setNewMilestoneProjectId(project.id)}>
                      <Plus size={12} /> Aggiungi
                    </button>
                  </div>
                  {pMilestones.length === 0
                    ? <p className="text-xs text-slate-500">Nessuna milestone</p>
                    : <div className="space-y-2">
                        {pMilestones.sort((a, b) => a.due_date.localeCompare(b.due_date)).map(ms => (
                          <div key={ms.id} className="flex items-center gap-3 group">
                            <button onClick={() => updateMilestone(ms.id, {
                              ...ms, project_id: ms.project_id, completed: !ms.completed
                            })}>
                              {ms.completed
                                ? <CheckCircle2 size={16} className="text-emerald-500" />
                                : <Circle size={16} className="text-slate-500" />
                              }
                            </button>
                            <span className={`text-sm flex-1 ${ms.completed ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                              {ms.name}
                            </span>
                            <span className="text-xs text-slate-400">
                              {format(parseISO(ms.due_date), 'dd/MM/yy')}
                            </span>
                            <div className="hidden group-hover:flex gap-1">
                              <button className="btn-ghost p-1" onClick={() => setEditMilestone(ms)}>
                                <Pencil size={12} />
                              </button>
                              <button className="btn-danger p-1" onClick={() => deleteMilestone(ms.id)}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                  }
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modals */}
      <Modal open={showNewProject} onClose={() => setShowNewProject(false)} title="Nuovo progetto" size="lg">
        <ProjectForm onSave={async d => { await createProject(d); setShowNewProject(false) }} onCancel={() => setShowNewProject(false)} />
      </Modal>

      <Modal open={!!editProject} onClose={() => setEditProject(null)} title="Modifica progetto" size="lg">
        {editProject && (
          <ProjectForm initial={editProject}
            onSave={async d => { await updateProject(editProject.id, d); setEditProject(null) }}
            onCancel={() => setEditProject(null)} />
        )}
      </Modal>

      <Modal open={!!newMilestoneProjectId} onClose={() => setNewMilestoneProjectId(null)} title="Nuova milestone" size="sm">
        {newMilestoneProjectId && (
          <MilestoneForm projectId={newMilestoneProjectId}
            onSave={async d => { await createMilestone(d); setNewMilestoneProjectId(null) }}
            onCancel={() => setNewMilestoneProjectId(null)} />
        )}
      </Modal>

      <Modal open={!!editMilestone} onClose={() => setEditMilestone(null)} title="Modifica milestone" size="sm">
        {editMilestone && (
          <MilestoneForm initial={editMilestone} projectId={editMilestone.project_id}
            onSave={async d => { await updateMilestone(editMilestone.id, d); setEditMilestone(null) }}
            onCancel={() => setEditMilestone(null)} />
        )}
      </Modal>

      {/* Confirm delete */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Conferma eliminazione" size="sm">
        <p className="text-sm text-slate-300 mb-5">
          Eliminare questo progetto? Verranno eliminate anche tutte le allocazioni e milestone associate.
        </p>
        <div className="flex justify-end gap-3">
          <button className="btn-ghost" onClick={() => setConfirmDelete(null)}>Annulla</button>
          <button className="btn-danger" onClick={async () => {
            if (confirmDelete) { await deleteProject(confirmDelete); setConfirmDelete(null) }
          }}>Elimina</button>
        </div>
      </Modal>
    </div>
  )
}
