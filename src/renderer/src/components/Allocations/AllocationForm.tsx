import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { Allocation } from '../../types'

type FormData = Omit<Allocation, 'id' | 'created_at' | 'person_name' | 'person_color' | 'project_name' | 'project_color'>

interface Props {
  initial?: Allocation
  onSave: (d: FormData) => void
  onCancel: () => void
}

export default function AllocationForm({ initial, onSave, onCancel }: Props) {
  const { people, projects } = useStore()

  const [form, setForm] = useState<FormData>({
    person_id: initial?.person_id ?? (people[0]?.id ?? 0),
    project_id: initial?.project_id ?? (projects[0]?.id ?? 0),
    start_date: initial?.start_date ?? '',
    end_date: initial?.end_date ?? '',
    percentage: initial?.percentage ?? 100,
    notes: initial?.notes ?? '',
    daily_rate: initial?.daily_rate ?? 0,
  })

  const set = (k: keyof FormData, v: unknown) => setForm(f => ({ ...f, [k]: v }))

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
      <div>
        <label className="label">% Allocazione: <span className="text-white font-bold">{form.percentage}%</span></label>
        <input type="range" min={10} max={200} step={5} value={form.percentage}
          onChange={e => set('percentage', parseInt(e.target.value))}
          className="w-full accent-blue-500 mt-1" />
        <div className="flex justify-between text-xs text-slate-500 mt-0.5">
          <span>10%</span><span>50%</span><span>100%</span><span>150%</span><span>200%</span>
        </div>
      </div>
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
