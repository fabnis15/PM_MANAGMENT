import { useState, useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { Person } from '../../types'
import Modal from '../ui/Modal'
import PersonForm from './PersonForm'
import { Plus, Pencil, Trash2, Users, Mail, DollarSign, Building2, Tag } from 'lucide-react'

const SENIORITY_COLORS: Record<string, string> = {
  junior: 'bg-slate-500/20 text-slate-400',
  mid: 'bg-blue-500/20 text-blue-400',
  senior: 'bg-emerald-500/20 text-emerald-400',
  lead: 'bg-violet-500/20 text-violet-400',
  manager: 'bg-amber-500/20 text-amber-400',
}

export default function PeoplePage() {
  const { people, allocations, createPerson, updatePerson, deletePerson } = useStore()
  const [showNew, setShowNew] = useState(false)
  const [editPerson, setEditPerson] = useState<Person | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const today = new Date()
  const year = today.getFullYear(), month = today.getMonth()

  const getAllocationThisMonth = (personId: number) => {
    const mStart = new Date(year, month, 1)
    const mEnd = new Date(year, month + 1, 0)
    return allocations
      .filter(a => a.person_id === personId &&
        new Date(a.start_date) <= mEnd &&
        new Date(a.end_date) >= mStart)
      .reduce((s, a) => s + a.percentage, 0)
  }

  const getProjectCount = (personId: number) => {
    const mStart = new Date(year, month, 1)
    const mEnd = new Date(year, month + 1, 0)
    const ids = new Set(allocations
      .filter(a => a.person_id === personId &&
        new Date(a.start_date) <= mEnd &&
        new Date(a.end_date) >= mStart)
      .map(a => a.project_id))
    return ids.size
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Persone</h1>
          <p className="text-sm text-slate-400">{people.length} risorse nel team</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)}>
          <Plus size={16} /> Aggiungi persona
        </button>
      </div>

      {people.length === 0 && (
        <div className="card text-center py-16 text-slate-500">
          <Users size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Nessuna persona aggiunta</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {people.map(person => {
          const alloc = getAllocationThisMonth(person.id)
          const projCount = getProjectCount(person.id)
          const allocColor = alloc > 100 ? 'text-red-400' : alloc > 80 ? 'text-amber-400' : 'text-emerald-400'
          const barColor = alloc > 100 ? 'bg-red-500' : alloc > 80 ? 'bg-amber-500' : 'bg-emerald-500'

          return (
            <div key={person.id} className="card hover:border-slate-600 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: person.color }}>
                    {person.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">{person.name}</div>
                    <div className="text-xs text-slate-400">{person.role || '—'}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="btn-ghost p-1.5" onClick={() => setEditPerson(person)}>
                    <Pencil size={13} />
                  </button>
                  <button className="btn-danger p-1.5" onClick={() => setConfirmDelete(person.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SENIORITY_COLORS[person.seniority]}`}>
                  {person.seniority.charAt(0).toUpperCase() + person.seniority.slice(1)}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                  FTE {person.fte}
                </span>
              </div>

              {/* Allocation bar */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-400">Allocazione mese corrente</span>
                  <span className={`text-xs font-bold ${allocColor}`}>{alloc}%</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full">
                  <div className={`h-1.5 rounded-full transition-all ${barColor}`}
                    style={{ width: `${Math.min(alloc, 120) / 1.2}%` }} />
                </div>
                <div className="text-xs text-slate-500 mt-1">{projCount} progett{projCount !== 1 ? 'i' : 'o'} attiv{projCount !== 1 ? 'i' : 'o'}</div>
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-xs">
                {person.inquadramento && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Tag size={12} />
                    <span className="truncate">{person.inquadramento}</span>
                  </div>
                )}
                {person.appartenenza && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Building2 size={12} />
                    <span className="truncate">{person.appartenenza}</span>
                  </div>
                )}
                {person.email && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Mail size={12} />
                    <span className="truncate">{person.email}</span>
                  </div>
                )}
                {person.hourly_rate > 0 && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <DollarSign size={12} />
                    <span>€{person.hourly_rate.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/ora</span>
                    <span className="text-slate-600">·</span>
                    <span>€{person.daily_rate.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/giorno</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Aggiungi persona">
        <PersonForm onSave={async d => { await createPerson(d); setShowNew(false) }} onCancel={() => setShowNew(false)} />
      </Modal>

      <Modal open={!!editPerson} onClose={() => setEditPerson(null)} title="Modifica persona">
        {editPerson && (
          <PersonForm initial={editPerson}
            onSave={async d => { await updatePerson(editPerson.id, d); setEditPerson(null) }}
            onCancel={() => setEditPerson(null)} />
        )}
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Conferma eliminazione" size="sm">
        <p className="text-sm text-slate-300 mb-5">
          Eliminare questa persona? Verranno eliminate anche tutte le allocazioni associate.
        </p>
        <div className="flex justify-end gap-3">
          <button className="btn-ghost" onClick={() => setConfirmDelete(null)}>Annulla</button>
          <button className="btn-danger" onClick={async () => {
            if (confirmDelete) { await deletePerson(confirmDelete); setConfirmDelete(null) }
          }}>Elimina</button>
        </div>
      </Modal>
    </div>
  )
}
