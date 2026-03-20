import { useState, useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { Allocation } from '../../types'
import Modal from '../ui/Modal'
import AllocationForm from './AllocationForm'
import GanttView from './GanttView'
import { Plus, Pencil, Trash2, CalendarDays, LayoutGrid, GanttChartSquare } from 'lucide-react'
import { format, parseISO, addMonths, startOfMonth } from 'date-fns'
import { it } from 'date-fns/locale'

type View = 'table' | 'matrix' | 'gantt'

export default function AllocationsPage() {
  const { allocations, people, projects, createAllocation, updateAllocation, deleteAllocation } = useStore()
  const [view, setView] = useState<View>('matrix')
  const [showNew, setShowNew] = useState(false)
  const [editAlloc, setEditAlloc] = useState<Allocation | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [filterPerson, setFilterPerson] = useState<number | 'all'>('all')

  const today = new Date()

  const months = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const d = startOfMonth(addMonths(today, i))
      return { date: d, year: d.getFullYear(), month: d.getMonth() }
    }), [])

  const getMonthAlloc = (personId: number, year: number, month: number) => {
    const mStart = new Date(year, month, 1)
    const mEnd = new Date(year, month + 1, 0)
    return allocations.filter(a =>
      a.person_id === personId &&
      new Date(a.start_date) <= mEnd &&
      new Date(a.end_date) >= mStart
    )
  }

  const openEdit = (id: number) => {
    const a = allocations.find(x => x.id === id)
    if (a) setEditAlloc(a)
  }

  const filteredAllocations = filterPerson === 'all'
    ? allocations
    : allocations.filter(a => a.person_id === filterPerson)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Allocazioni</h1>
          <p className="text-sm text-slate-400">{allocations.length} allocazioni totali</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-800 border border-slate-700 rounded-lg p-1 gap-1">
            <button onClick={() => setView('gantt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                view === 'gantt' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}>
              <GanttChartSquare size={13} /> Gantt
            </button>
            <button onClick={() => setView('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                view === 'matrix' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}>
              <LayoutGrid size={13} /> Matrice
            </button>
            <button onClick={() => setView('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                view === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}>
              <CalendarDays size={13} /> Lista
            </button>
          </div>
          <button className="btn-primary" onClick={() => setShowNew(true)}>
            <Plus size={16} /> Nuova allocazione
          </button>
        </div>
      </div>

      {/* Gantt View */}
      {view === 'gantt' && <GanttView onEdit={openEdit} />}

      {/* Matrix View */}
      {view === 'matrix' && (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs w-36">Persona</th>
                {months.map(m => (
                  <th key={`${m.year}-${m.month}`} className="px-2 py-3 text-slate-400 font-medium text-xs text-center min-w-[120px]">
                    {format(m.date, 'MMM yy', { locale: it }).toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {people.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-slate-500 text-xs">Nessuna persona</td></tr>
              )}
              {people.map(person => (
                <tr key={person.id} className="border-b border-slate-700/50 last:border-0 hover:bg-slate-700/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-white flex-shrink-0"
                        style={{ background: person.color }}>
                        {person.name[0]}
                      </div>
                      <span className="text-slate-300 text-xs font-medium truncate max-w-[90px]">{person.name}</span>
                    </div>
                  </td>
                  {months.map(({ year, month, date }) => {
                    const ma = getMonthAlloc(person.id, year, month)
                    const total = ma.reduce((s, a) => s + a.percentage, 0)
                    const bgColor = total === 0 ? '' :
                      total > 100 ? 'bg-red-500/15' :
                      total > 80 ? 'bg-amber-500/15' : 'bg-emerald-500/10'
                    const textColor = total === 0 ? 'text-slate-600' :
                      total > 100 ? 'text-red-400 font-bold' :
                      total > 80 ? 'text-amber-400' : 'text-emerald-400'

                    return (
                      <td key={`${year}-${month}`} className={`px-2 py-2 text-center ${bgColor}`}>
                        {total > 0 && (
                          <div>
                            <div className={`text-xs font-semibold ${textColor}`}>{total}%</div>
                            <div className="space-y-0.5 mt-1">
                              {ma.map(a => (
                                <div key={a.id}
                                  className="text-xs px-1.5 py-0.5 rounded text-slate-300 truncate max-w-[100px] mx-auto cursor-pointer hover:brightness-125 transition-all"
                                  style={{ background: (a.project_color || '#3b82f6') + '30' }}
                                  onClick={() => openEdit(a.id)}
                                  title="Clicca per modificare">
                                  {a.project_name?.split(' ')[0]}{' '}
                                  {a.allocation_type === 'days'
                                    ? `${a.allocated_days}gg`
                                    : `${a.percentage}%`}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {total === 0 && <span className={`text-xs ${textColor}`}>—</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Table / Lista View */}
      {view === 'table' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400">Filtra per persona:</label>
            <select className="input w-auto text-xs py-1.5" value={filterPerson}
              onChange={e => setFilterPerson(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}>
              <option value="all">Tutti</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-700/30">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Persona</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Progetto</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Periodo</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium text-xs">Allocazione</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Note</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredAllocations.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-10 text-slate-500 text-xs">Nessuna allocazione</td></tr>
                )}
                {filteredAllocations.map(a => {
                  const isDays = a.allocation_type === 'days'
                  return (
                    <tr key={a.id} className="border-b border-slate-700/50 last:border-0 hover:bg-slate-700/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white flex-shrink-0"
                            style={{ background: a.person_color || '#3b82f6' }}>
                            {a.person_name?.[0]}
                          </div>
                          <span className="text-slate-300 text-xs">{a.person_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: a.project_color || '#10b981' }} />
                          <span className="text-slate-300 text-xs">{a.project_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {format(parseISO(a.start_date), 'dd/MM/yy')} → {format(parseISO(a.end_date), 'dd/MM/yy')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isDays ? (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                            {a.allocated_days} gg
                          </span>
                        ) : (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            a.percentage > 100 ? 'bg-red-500/20 text-red-400' :
                            a.percentage > 80 ? 'bg-amber-500/20 text-amber-400' :
                            'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {a.percentage}%
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[150px] truncate">{a.notes || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button className="btn-ghost p-1.5" onClick={() => setEditAlloc(a)}>
                            <Pencil size={12} />
                          </button>
                          <button className="btn-danger p-1.5" onClick={() => setConfirmDelete(a.id)}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nuova allocazione">
        <AllocationForm onSave={async d => { await createAllocation(d); setShowNew(false) }} onCancel={() => setShowNew(false)} />
      </Modal>

      <Modal open={!!editAlloc} onClose={() => setEditAlloc(null)} title="Modifica allocazione">
        {editAlloc && (
          <AllocationForm initial={editAlloc}
            onSave={async d => { await updateAllocation(editAlloc.id, d); setEditAlloc(null) }}
            onCancel={() => setEditAlloc(null)} />
        )}
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Conferma eliminazione" size="sm">
        <p className="text-sm text-slate-300 mb-5">Eliminare questa allocazione?</p>
        <div className="flex justify-end gap-3">
          <button className="btn-ghost" onClick={() => setConfirmDelete(null)}>Annulla</button>
          <button className="btn-danger" onClick={async () => {
            if (confirmDelete) { await deleteAllocation(confirmDelete); setConfirmDelete(null) }
          }}>Elimina</button>
        </div>
      </Modal>
    </div>
  )
}
