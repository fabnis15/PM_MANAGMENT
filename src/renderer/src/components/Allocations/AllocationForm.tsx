import { useState, useMemo } from 'react'
import { useStore, getWorkingDays } from '../../store/useStore'
import { Allocation, AllocationType } from '../../types'

type FormData = Omit<Allocation, 'id' | 'created_at' | 'person_name' | 'person_color' | 'project_name' | 'project_color'>

interface Props {
  initial?: Allocation
  onSave: (d: FormData) => void
  onCancel: () => void
}

export default function AllocationForm({ initial, onSave, onCancel }: Props) {
  const { people, projects, holidays, leaves } = useStore()

  const [form, setForm] = useState<FormData>({
    person_id: initial?.person_id ?? (people[0]?.id ?? 0),
    project_id: initial?.project_id ?? (projects[0]?.id ?? 0),
    start_date: initial?.start_date ?? '',
    end_date: initial?.end_date ?? '',
    percentage: initial?.percentage ?? 100,
    allocation_type: initial?.allocation_type ?? 'percentage',
    allocated_days: initial?.allocated_days ?? 0,
    notes: initial?.notes ?? '',
    daily_rate: initial?.daily_rate ?? 0,
  })

  const set = (k: keyof FormData, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  // Giorni lavorativi disponibili nel periodo per la persona selezionata
  const availableWorkingDays = useMemo(() => {
    if (!form.start_date || !form.end_date || form.start_date > form.end_date) return null
    const personLeaves = leaves.filter(l => l.person_id === form.person_id)
    return getWorkingDays(form.start_date, form.end_date, holidays, personLeaves)
  }, [form.start_date, form.end_date, form.person_id, holidays, leaves])

  // Quando si cambia modalità, inizializza il valore di conseguenza
  const switchMode = (mode: AllocationType) => {
    if (mode === 'days' && availableWorkingDays !== null) {
      const days = Math.round(availableWorkingDays * (form.percentage / 100))
      set('allocation_type', mode)
      setForm(f => ({ ...f, allocation_type: mode, allocated_days: days > 0 ? days : 1 }))
    } else if (mode === 'percentage') {
      const pct = availableWorkingDays && form.allocated_days
        ? Math.round((form.allocated_days / availableWorkingDays) * 100)
        : 100
      setForm(f => ({ ...f, allocation_type: mode, percentage: Math.min(200, Math.max(10, pct)) }))
    } else {
      set('allocation_type', mode)
    }
  }

  const equivalentPct = availableWorkingDays && availableWorkingDays > 0 && form.allocation_type === 'days'
    ? Math.round((form.allocated_days / availableWorkingDays) * 100)
    : null

  return (
    <form onSubmit={e => {
      e.preventDefault()
      if (!form.person_id || !form.project_id || !form.start_date || !form.end_date) return
      onSave(form)
    }} className="space-y-4">

      <div>
        <label className="label">Persona *</label>
        <select className="input" value={form.person_id}
          onChange={e => set('person_id', parseInt(e.target.value))}>
          <option value="">— Seleziona —</option>
          {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div>
        <label className="label">Progetto *</label>
        <select className="input" value={form.project_id}
          onChange={e => set('project_id', parseInt(e.target.value))}>
          <option value="">— Seleziona —</option>
          {projects.filter(p => p.status !== 'cancelled' && p.status !== 'completed').map(p =>
            <option key={p.id} value={p.id}>{p.name}{p.client ? ` (${p.client})` : ''}</option>
          )}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Data inizio *</label>
          <input type="date" className="input" value={form.start_date}
            onChange={e => set('start_date', e.target.value)} required />
        </div>
        <div>
          <label className="label">Data fine *</label>
          <input type="date" className="input" value={form.end_date}
            onChange={e => set('end_date', e.target.value)} required />
        </div>
      </div>

      {/* Giorni lavorativi disponibili */}
      {availableWorkingDays !== null && (
        <div className="bg-slate-700/40 rounded-lg px-3 py-2 text-xs text-slate-400 flex items-center gap-2">
          <span className="text-slate-300 font-medium">{availableWorkingDays}</span>
          giorni lavorativi nel periodo (esclusi festivi e assenze)
        </div>
      )}

      {/* Modalità allocazione */}
      <div>
        <label className="label">Modalità allocazione</label>
        <div className="flex bg-slate-700/60 border border-slate-600 rounded-lg p-1 gap-1 w-fit">
          <button type="button"
            onClick={() => switchMode('percentage')}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              form.allocation_type === 'percentage' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            % Percentuale
          </button>
          <button type="button"
            onClick={() => switchMode('days')}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              form.allocation_type === 'days' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            Giorni
          </button>
        </div>
      </div>

      {/* Input in base alla modalità */}
      {form.allocation_type === 'percentage' ? (
        <div>
          <label className="label">
            % Allocazione: <span className="text-white font-bold">{form.percentage}%</span>
            {availableWorkingDays !== null && (
              <span className="text-slate-500 ml-2 font-normal">
                ≈ {Math.round(availableWorkingDays * (form.percentage / 100))} giorni
              </span>
            )}
          </label>
          <input type="range" min={10} max={200} step={5} value={form.percentage}
            onChange={e => set('percentage', parseInt(e.target.value))}
            className="w-full accent-blue-500 mt-1" />
          <div className="flex justify-between text-xs text-slate-500 mt-0.5">
            <span>10%</span><span>50%</span><span>100%</span><span>150%</span><span>200%</span>
          </div>
        </div>
      ) : (
        <div>
          <label className="label">
            Giorni allocati
            {equivalentPct !== null && (
              <span className="text-slate-500 ml-2 font-normal">≈ {equivalentPct}% del periodo</span>
            )}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0.5}
              step={0.5}
              className="input w-32 text-center text-lg font-bold"
              value={form.allocated_days || ''}
              placeholder="0"
              onChange={e => set('allocated_days', parseFloat(e.target.value) || 0)}
            />
            <span className="text-slate-400 text-sm">giorni</span>
            {availableWorkingDays !== null && (
              <button type="button"
                className="btn btn-ghost text-xs px-2 py-1"
                onClick={() => set('allocated_days', availableWorkingDays)}>
                Imposta tutti ({availableWorkingDays}gg)
              </button>
            )}
          </div>
        </div>
      )}

      <div>
        <label className="label">Note</label>
        <textarea className="input resize-none min-h-[60px]" value={form.notes}
          onChange={e => set('notes', e.target.value)} />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Annulla</button>
        <button type="submit" className="btn-primary">{initial ? 'Salva modifiche' : 'Crea allocazione'}</button>
      </div>
    </form>
  )
}
