import { useState } from 'react'
import { Project } from '../../types'

const COLORS = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899','#14b8a6','#f97316','#6366f1']
const STATUSES = [
  { value: 'planning', label: 'Pianificazione' },
  { value: 'active', label: 'Attivo' },
  { value: 'on-hold', label: 'In pausa' },
  { value: 'completed', label: 'Completato' },
  { value: 'cancelled', label: 'Annullato' },
]

type FormData = Omit<Project, 'id' | 'created_at'>

interface Props {
  initial?: Project
  onSave: (d: FormData) => void
  onCancel: () => void
}

export default function ProjectForm({ initial, onSave, onCancel }: Props) {
  const [form, setForm] = useState<FormData>({
    name: initial?.name ?? '',
    client: initial?.client ?? '',
    description: initial?.description ?? '',
    start_date: initial?.start_date ?? '',
    end_date: initial?.end_date ?? '',
    status: initial?.status ?? 'planning',
    budget_total: initial?.budget_total ?? 0,
    color: initial?.color ?? '#3b82f6',
  })

  const set = (k: keyof FormData, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.start_date || !form.end_date) return
    onSave(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Nome progetto *</label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
        </div>
        <div>
          <label className="label">Cliente</label>
          <input className="input" value={form.client} onChange={e => set('client', e.target.value)} />
        </div>
        <div>
          <label className="label">Stato</label>
          <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Data inizio *</label>
          <input type="date" className="input" value={form.start_date} onChange={e => set('start_date', e.target.value)} required />
        </div>
        <div>
          <label className="label">Data fine *</label>
          <input type="date" className="input" value={form.end_date} onChange={e => set('end_date', e.target.value)} required />
        </div>
        <div>
          <label className="label">Budget totale (€)</label>
          <input type="number" min={0} step={100} className="input" value={form.budget_total}
            onChange={e => set('budget_total', parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <label className="label">Colore</label>
          <div className="flex gap-2 flex-wrap mt-1">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => set('color', c)}
                className={`w-6 h-6 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-800' : ''}`}
                style={{ background: c }} />
            ))}
          </div>
        </div>
        <div className="col-span-2">
          <label className="label">Descrizione</label>
          <textarea className="input min-h-[70px] resize-none" value={form.description}
            onChange={e => set('description', e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Annulla</button>
        <button type="submit" className="btn-primary">
          {initial ? 'Salva modifiche' : 'Crea progetto'}
        </button>
      </div>
    </form>
  )
}
