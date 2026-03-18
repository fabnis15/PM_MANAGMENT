import { useState } from 'react'
import { Person } from '../../types'

const COLORS = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899','#14b8a6','#f97316','#6366f1']
const SENIORITIES = [
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'manager', label: 'Manager' },
]

type FormData = Omit<Person, 'id' | 'created_at'>

interface Props {
  initial?: Person
  onSave: (d: FormData) => void
  onCancel: () => void
}

export default function PersonForm({ initial, onSave, onCancel }: Props) {
  const [form, setForm] = useState<FormData>({
    name: initial?.name ?? '',
    role: initial?.role ?? '',
    seniority: initial?.seniority ?? 'mid',
    email: initial?.email ?? '',
    daily_rate: initial?.daily_rate ?? 0,
    fte: initial?.fte ?? 1,
    color: initial?.color ?? '#3b82f6',
  })

  const set = (k: keyof FormData, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); if (!form.name) return; onSave(form) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Nome *</label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
        </div>
        <div>
          <label className="label">Ruolo</label>
          <input className="input" value={form.role} onChange={e => set('role', e.target.value)}
            placeholder="es. Developer, Designer…" />
        </div>
        <div>
          <label className="label">Seniority</label>
          <select className="input" value={form.seniority} onChange={e => set('seniority', e.target.value)}>
            {SENIORITIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div>
          <label className="label">Tariffa giornaliera (€)</label>
          <input type="number" min={0} step={50} className="input" value={form.daily_rate}
            onChange={e => set('daily_rate', parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <label className="label">FTE (0–1)</label>
          <input type="number" min={0} max={1} step={0.1} className="input" value={form.fte}
            onChange={e => set('fte', parseFloat(e.target.value) || 1)} />
        </div>
        <div>
          <label className="label">Colore</label>
          <div className="flex gap-2 flex-wrap mt-1">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => set('color', c)}
                className={`w-6 h-6 rounded-full transition-transform ${
                  form.color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-800' : ''
                }`} style={{ background: c }} />
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Annulla</button>
        <button type="submit" className="btn-primary">{initial ? 'Salva modifiche' : 'Aggiungi persona'}</button>
      </div>
    </form>
  )
}
