import { useState, useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { Holiday, Leave } from '../../types'
import Modal from '../ui/Modal'
import { Plus, Pencil, Trash2, CalendarDays, Users, Building2, Globe, CheckCircle2, XCircle } from 'lucide-react'
import { format, parseISO, eachDayOfInterval } from 'date-fns'
import { it } from 'date-fns/locale'

type Tab = 'holidays' | 'leaves'

const LEAVE_LABELS: Record<string, string> = {
  ferie: 'Ferie', permesso: 'Permesso', malattia: 'Malattia', altro: 'Altro'
}
const LEAVE_COLORS: Record<string, string> = {
  ferie: 'bg-blue-500/20 text-blue-400',
  permesso: 'bg-amber-500/20 text-amber-400',
  malattia: 'bg-red-500/20 text-red-400',
  altro: 'bg-slate-500/20 text-slate-400',
}

function pad(n: number) { return String(n).padStart(2, '0') }
function toDateStr(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

function countBusinessDays(start: string, end: string): number {
  let count = 0
  const cur = new Date(start)
  const endD = new Date(end)
  while (cur <= endD) {
    const d = cur.getDay()
    if (d !== 0 && d !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

// ── Holiday Form ──────────────────────────────────────────────────────────────
function HolidayForm({ initial, onSave, onCancel, existingHolidays }: {
  initial?: Holiday
  onSave: (days: Omit<Holiday, 'id' | 'created_at'>[]) => void
  onCancel: () => void
  existingHolidays?: Holiday[]
}) {
  const [mode, setMode] = useState<'single' | 'range'>(initial ? 'single' : 'single')
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    date: initial?.date ?? '',
    rangeStart: '',
    rangeEnd: '',
    skipWeekends: true,
    skipExisting: true,
    type: (initial?.type ?? 'company') as 'national' | 'company',
    recurring: initial ? !!initial.recurring : false,
    active: initial ? !!initial.active : true,
  })
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  // Set di date già presenti (festività attive)
  const existingDates = useMemo(() => {
    if (!existingHolidays) return new Set<string>()
    const set = new Set<string>()
    existingHolidays.forEach(h => {
      if (!h.active) return
      if (h.recurring) {
        // La data ricorrente: match per MM-DD su qualsiasi anno
        set.add(`recurring:${h.date.slice(5)}`) // MM-DD
      } else {
        set.add(h.date)
      }
    })
    return set
  }, [existingHolidays])

  const isExistingDate = (d: Date): boolean => {
    const dateStr = toDateStr(d)
    const mmdd = dateStr.slice(5)
    return existingDates.has(dateStr) || existingDates.has(`recurring:${mmdd}`)
  }

  // Compute preview days for range mode
  const { included, skippedWeekend, skippedExisting } = useMemo(() => {
    if (mode !== 'range' || !form.rangeStart || !form.rangeEnd || form.rangeStart > form.rangeEnd) {
      return { included: [], skippedWeekend: 0, skippedExisting: 0 }
    }
    try {
      const all = eachDayOfInterval({ start: new Date(form.rangeStart), end: new Date(form.rangeEnd) })
      let skippedWeekend = 0
      let skippedExisting = 0
      const included: Date[] = []
      for (const d of all) {
        const isWeekend = d.getDay() === 0 || d.getDay() === 6
        const isExisting = isExistingDate(d)
        if (form.skipWeekends && isWeekend) { skippedWeekend++; continue }
        if (form.skipExisting && isExisting) { skippedExisting++; continue }
        included.push(d)
      }
      return { included, skippedWeekend, skippedExisting }
    } catch {
      return { included: [], skippedWeekend: 0, skippedExisting: 0 }
    }
  }, [mode, form.rangeStart, form.rangeEnd, form.skipWeekends, form.skipExisting, existingDates])

  const rangeDays = included

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'single') {
      if (!form.name || !form.date) return
      onSave([{ name: form.name, date: form.date, type: form.type, recurring: form.recurring ? 1 : 0, active: form.active ? 1 : 0 }])
    } else {
      if (!form.name || rangeDays.length === 0) return
      onSave(rangeDays.map(d => ({
        name: form.name,
        date: toDateStr(d),
        type: form.type,
        recurring: 0,
        active: form.active ? 1 : 0,
      })))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Nome *</label>
        <input className="input" value={form.name} onChange={e => set('name', e.target.value)}
          placeholder="es. Chiusura aziendale estiva" required />
      </div>

      {/* Tipo */}
      <div>
        <label className="label">Tipo</label>
        <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
          <option value="national">Festività nazionale</option>
          <option value="company">Chiusura aziendale</option>
        </select>
      </div>

      {/* Modalità selezione giorni — solo per nuove chiusure (non in edit) */}
      {!initial && (
        <div>
          <label className="label">Selezione giorni</label>
          <div className="flex bg-slate-700/60 border border-slate-600 rounded-lg p-1 gap-1 w-fit">
            <button type="button"
              onClick={() => setMode('single')}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${mode === 'single' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              Giorno singolo
            </button>
            <button type="button"
              onClick={() => setMode('range')}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${mode === 'range' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              Più giorni / periodo
            </button>
          </div>
        </div>
      )}

      {/* Single day */}
      {mode === 'single' && (
        <div>
          <label className="label">Data *</label>
          <input type="date" className="input" value={form.date} onChange={e => set('date', e.target.value)} required />
        </div>
      )}

      {/* Range */}
      {mode === 'range' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Dal *</label>
              <input type="date" className="input" value={form.rangeStart} onChange={e => set('rangeStart', e.target.value)} required />
            </div>
            <div>
              <label className="label">Al *</label>
              <input type="date" className="input" value={form.rangeEnd} onChange={e => set('rangeEnd', e.target.value)} required />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.skipWeekends} onChange={e => set('skipWeekends', e.target.checked)}
              className="w-4 h-4 accent-blue-500" />
            <span className="text-sm text-slate-300">Escludi sabati e domeniche</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.skipExisting} onChange={e => set('skipExisting', e.target.checked)}
              className="w-4 h-4 accent-blue-500" />
            <span className="text-sm text-slate-300">Escludi festività già inserite</span>
          </label>

          {/* Preview giorni */}
          {rangeDays.length > 0 && (
            <div className="bg-slate-700/40 rounded-lg px-3 py-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-300 font-medium">
                  {rangeDays.length} giorn{rangeDays.length !== 1 ? 'i' : 'o'} da inserire
                </div>
                <div className="flex gap-2 text-xs text-slate-500">
                  {skippedWeekend > 0 && <span>{skippedWeekend} weekend saltati</span>}
                  {skippedExisting > 0 && <span>{skippedExisting} già presenti saltati</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                {rangeDays.map(d => (
                  <span key={toDateStr(d)} className="bg-blue-600/30 text-blue-300 text-xs px-2 py-0.5 rounded">
                    {format(d, 'dd MMM', { locale: it })}
                  </span>
                ))}
              </div>
            </div>
          )}
          {form.rangeStart && form.rangeEnd && form.rangeStart <= form.rangeEnd && rangeDays.length === 0 && (
            <div className="text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
              Nessun giorno da inserire (tutti esclusi)
            </div>
          )}
        </div>
      )}

      {/* Options comuni */}
      <div className="flex flex-col gap-2">
        {mode === 'single' && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.recurring} onChange={e => set('recurring', e.target.checked)}
              className="w-4 h-4 accent-blue-500" />
            <span className="text-sm text-slate-300">Ricorrente ogni anno (stessa data)</span>
          </label>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)}
            className="w-4 h-4 accent-blue-500" />
          <span className="text-sm text-slate-300">Attiva (considera nei calcoli)</span>
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Annulla</button>
        <button type="submit" className="btn-primary" disabled={mode === 'range' && rangeDays.length === 0}>
          {initial ? 'Salva' : mode === 'range' ? `Aggiungi ${rangeDays.length} giorni` : 'Aggiungi'}
        </button>
      </div>
    </form>
  )
}

// ── Leave Form ────────────────────────────────────────────────────────────────
function LeaveForm({ initial, onSave, onCancel }: {
  initial?: Leave
  onSave: (d: Omit<Leave, 'id' | 'created_at' | 'person_name' | 'person_color'>) => void
  onCancel: () => void
}) {
  const { people } = useStore()
  const [form, setForm] = useState({
    person_id: initial?.person_id ?? (people[0]?.id ?? 0),
    start_date: initial?.start_date ?? '',
    end_date: initial?.end_date ?? '',
    type: initial?.type ?? 'ferie' as Leave['type'],
    notes: initial?.notes ?? '',
  })
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const days = form.start_date && form.end_date ? countBusinessDays(form.start_date, form.end_date) : 0

  return (
    <form onSubmit={e => { e.preventDefault(); if (!form.person_id || !form.start_date || !form.end_date) return; onSave(form) }}
      className="space-y-4">
      <div>
        <label className="label">Persona *</label>
        <select className="input" value={form.person_id} onChange={e => set('person_id', parseInt(e.target.value))}>
          {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Tipo</label>
        <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
          <option value="ferie">Ferie</option>
          <option value="permesso">Permesso</option>
          <option value="malattia">Malattia</option>
          <option value="altro">Altro</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Dal *</label>
          <input type="date" className="input" value={form.start_date} onChange={e => set('start_date', e.target.value)} required />
        </div>
        <div>
          <label className="label">Al *</label>
          <input type="date" className="input" value={form.end_date} onChange={e => set('end_date', e.target.value)} required />
        </div>
      </div>
      {days > 0 && (
        <div className="text-xs text-slate-400 bg-slate-700/40 rounded-lg px-3 py-2">
          {days} giorn{days !== 1 ? 'i' : 'o'} lavorativ{days !== 1 ? 'i' : 'o'}
        </div>
      )}
      <div>
        <label className="label">Note</label>
        <textarea className="input resize-none min-h-[60px]" value={form.notes}
          onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Annulla</button>
        <button type="submit" className="btn-primary">{initial ? 'Salva' : 'Aggiungi'}</button>
      </div>
    </form>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const { holidays, leaves, people, createHoliday, updateHoliday, deleteHoliday,
    createLeave, updateLeave, deleteLeave } = useStore()

  const [tab, setTab] = useState<Tab>('holidays')
  const [showNewHoliday, setShowNewHoliday] = useState(false)
  const [editHoliday, setEditHoliday] = useState<Holiday | null>(null)
  const [showNewLeave, setShowNewLeave] = useState(false)
  const [editLeave, setEditLeave] = useState<Leave | null>(null)
  const [filterPerson, setFilterPerson] = useState<number | 'all'>('all')
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'holiday' | 'leave'; id: number } | null>(null)

  const national = holidays.filter(h => h.type === 'national').sort((a, b) => a.date.localeCompare(b.date))
  const company = holidays.filter(h => h.type === 'company').sort((a, b) => a.date.localeCompare(b.date))

  const filteredLeaves = useMemo(() =>
    filterPerson === 'all' ? leaves : leaves.filter(l => l.person_id === filterPerson),
    [leaves, filterPerson]
  )

  const handleSaveHolidays = async (days: Omit<Holiday, 'id' | 'created_at'>[]) => {
    for (const d of days) {
      await createHoliday(d)
    }
    setShowNewHoliday(false)
  }

  const HolidayRow = ({ h }: { h: Holiday }) => (
    <tr className="border-b border-slate-700/40 last:border-0 hover:bg-slate-700/20">
      <td className="px-4 py-2.5 text-sm text-slate-300">{h.name}</td>
      <td className="px-4 py-2.5 text-xs text-slate-400">
        {format(parseISO(h.date), h.recurring ? 'dd MMMM' : 'dd MMMM yyyy', { locale: it })}
      </td>
      <td className="px-4 py-2.5 text-center">
        {h.recurring ? <CheckCircle2 size={14} className="text-emerald-500 mx-auto" /> : <span className="text-slate-600 text-xs">—</span>}
      </td>
      <td className="px-4 py-2.5 text-center">
        <button onClick={() => updateHoliday(h.id, { ...h, active: h.active ? 0 : 1 })}>
          {h.active
            ? <CheckCircle2 size={14} className="text-emerald-500 mx-auto" />
            : <XCircle size={14} className="text-slate-600 mx-auto" />}
        </button>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1 justify-end">
          <button className="btn-ghost p-1.5" onClick={() => setEditHoliday(h)}><Pencil size={12} /></button>
          <button className="btn-danger p-1.5" onClick={() => setConfirmDelete({ type: 'holiday', id: h.id })}><Trash2 size={12} /></button>
        </div>
      </td>
    </tr>
  )

  const tableHead = (
    <thead>
      <tr className="border-b border-slate-700 bg-slate-700/30">
        <th className="text-left px-4 py-2.5 text-xs text-slate-400 font-medium">Nome</th>
        <th className="text-left px-4 py-2.5 text-xs text-slate-400 font-medium">Data</th>
        <th className="text-center px-4 py-2.5 text-xs text-slate-400 font-medium">Ricorrente</th>
        <th className="text-center px-4 py-2.5 text-xs text-slate-400 font-medium">Attiva</th>
        <th className="px-4 py-2.5"></th>
      </tr>
    </thead>
  )

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Calendario</h1>
          <p className="text-sm text-slate-400">Festività, chiusure aziendali e assenze del team</p>
        </div>
        <button className="btn-primary"
          onClick={() => tab === 'holidays' ? setShowNewHoliday(true) : setShowNewLeave(true)}>
          <Plus size={16} />
          {tab === 'holidays' ? 'Aggiungi chiusura' : 'Aggiungi assenza'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 p-1 rounded-lg w-fit">
        <button onClick={() => setTab('holidays')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
            tab === 'holidays' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
          }`}>
          <CalendarDays size={13} /> Festività & Chiusure
          <span className="ml-1 bg-slate-700 text-slate-300 px-1.5 rounded-full text-xs">{holidays.length}</span>
        </button>
        <button onClick={() => setTab('leaves')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
            tab === 'leaves' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
          }`}>
          <Users size={13} /> Ferie & Permessi
          <span className="ml-1 bg-slate-700 text-slate-300 px-1.5 rounded-full text-xs">{leaves.length}</span>
        </button>
      </div>

      {/* ── Holidays tab ── */}
      {tab === 'holidays' && (
        <div className="space-y-5">
          {/* National */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Globe size={14} className="text-slate-400" />
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Festività nazionali ({national.length})
              </h2>
            </div>
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                {tableHead}
                <tbody>
                  {national.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-slate-500 text-xs">Nessuna festività</td></tr>
                  )}
                  {national.map(h => <HolidayRow key={h.id} h={h} />)}
                </tbody>
              </table>
            </div>
          </div>

          {/* Company closures */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-slate-400" />
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Chiusure aziendali ({company.length})
                </h2>
              </div>
            </div>
            {company.length === 0
              ? <div className="card text-center py-8 text-slate-500 text-sm">
                  Nessuna chiusura aziendale — clicca "Aggiungi chiusura"
                </div>
              : <div className="card p-0 overflow-hidden">
                  <table className="w-full text-sm">
                    {tableHead}
                    <tbody>
                      {company.map(h => <HolidayRow key={h.id} h={h} />)}
                    </tbody>
                  </table>
                </div>
            }
          </div>
        </div>
      )}

      {/* ── Leaves tab ── */}
      {tab === 'leaves' && (
        <div className="space-y-4">
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
                  <th className="text-left px-4 py-2.5 text-xs text-slate-400 font-medium">Persona</th>
                  <th className="text-left px-4 py-2.5 text-xs text-slate-400 font-medium">Tipo</th>
                  <th className="text-left px-4 py-2.5 text-xs text-slate-400 font-medium">Periodo</th>
                  <th className="text-center px-4 py-2.5 text-xs text-slate-400 font-medium">Giorni lav.</th>
                  <th className="text-left px-4 py-2.5 text-xs text-slate-400 font-medium">Note</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-10 text-slate-500 text-xs">Nessuna assenza registrata</td></tr>
                )}
                {filteredLeaves.sort((a, b) => b.start_date.localeCompare(a.start_date)).map(l => (
                  <tr key={l.id} className="border-b border-slate-700/40 last:border-0 hover:bg-slate-700/20">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white"
                          style={{ background: l.person_color || '#3b82f6' }}>
                          {l.person_name?.[0]}
                        </div>
                        <span className="text-xs text-slate-300">{l.person_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEAVE_COLORS[l.type]}`}>
                        {LEAVE_LABELS[l.type]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">
                      {format(parseISO(l.start_date), 'dd/MM/yy')} → {format(parseISO(l.end_date), 'dd/MM/yy')}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs text-slate-300">
                      {countBusinessDays(l.start_date, l.end_date)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[160px] truncate">{l.notes || '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button className="btn-ghost p-1.5" onClick={() => setEditLeave(l)}><Pencil size={12} /></button>
                        <button className="btn-danger p-1.5" onClick={() => setConfirmDelete({ type: 'leave', id: l.id })}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <Modal open={showNewHoliday} onClose={() => setShowNewHoliday(false)} title="Aggiungi chiusura / festività">
        <HolidayForm
          existingHolidays={holidays}
          onSave={handleSaveHolidays}
          onCancel={() => setShowNewHoliday(false)} />
      </Modal>

      <Modal open={!!editHoliday} onClose={() => setEditHoliday(null)} title="Modifica festività" size="sm">
        {editHoliday && (
          <HolidayForm initial={editHoliday}
            onSave={async days => { await updateHoliday(editHoliday.id, days[0]); setEditHoliday(null) }}
            onCancel={() => setEditHoliday(null)} />
        )}
      </Modal>

      <Modal open={showNewLeave} onClose={() => setShowNewLeave(false)} title="Aggiungi assenza" size="sm">
        <LeaveForm
          onSave={async d => { await createLeave(d); setShowNewLeave(false) }}
          onCancel={() => setShowNewLeave(false)} />
      </Modal>

      <Modal open={!!editLeave} onClose={() => setEditLeave(null)} title="Modifica assenza" size="sm">
        {editLeave && (
          <LeaveForm initial={editLeave}
            onSave={async d => { await updateLeave(editLeave.id, d); setEditLeave(null) }}
            onCancel={() => setEditLeave(null)} />
        )}
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Conferma eliminazione" size="sm">
        <p className="text-sm text-slate-300 mb-5">Eliminare questo elemento?</p>
        <div className="flex justify-end gap-3">
          <button className="btn-ghost" onClick={() => setConfirmDelete(null)}>Annulla</button>
          <button className="btn-danger" onClick={async () => {
            if (!confirmDelete) return
            if (confirmDelete.type === 'holiday') await deleteHoliday(confirmDelete.id)
            else await deleteLeave(confirmDelete.id)
            setConfirmDelete(null)
          }}>Elimina</button>
        </div>
      </Modal>
    </div>
  )
}
