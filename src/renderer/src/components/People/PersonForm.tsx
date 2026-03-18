import { useState } from 'react'
import { Person } from '../../types'
import { useStore } from '../../store/useStore'

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
  const { settings } = useStore()
  const hoursPerDay = settings.working_hours_per_day || 8

  const [form, setForm] = useState<FormData>({
    name: initial?.name ?? '',
    role: initial?.role ?? '',
    seniority: initial?.seniority ?? 'mid',
    inquadramento: initial?.inquadramento ?? '',
    appartenenza: initial?.appartenenza ?? '',
    email: initial?.email ?? '',
    hourly_rate: initial?.hourly_rate ?? 0,
    daily_rate: initial?.daily_rate ?? 0,
    fte: initial?.fte ?? 1,
    color: initial?.color ?? '#3b82f6',
  })

  const setField = (k: keyof FormData, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleHourlyChange = (value: number) => {
    setForm(f => ({
      ...f,
      hourly_rate: value,
      daily_rate: parseFloat((value * hoursPerDay).toFixed(2))
    }))
  }

  const handleDailyChange = (value: number) => {
    setForm(f => ({
      ...f,
      daily_rate: value,
      hourly_rate: parseFloat((value / hoursPerDay).toFixed(2))
    }))
  }

  return (
    <form onSubmit={e => { e.preventDefault(); if (!form.name) return; onSave(form) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Nome *</label>
          <input className="input" value={form.name} onChange={e => setField('name', e.target.value)} required />
        </div>
        <div>
          <label className="label">Ruolo</label>
          <input className="input" value={form.role} onChange={e => setField('role', e.target.value)}
            placeholder="es. Developer, Designer…" />
        </div>
        <div>
          <label className="label">Seniority</label>
          <select className="input" value={form.seniority} onChange={e => setField('seniority', e.target.value)}>
            {SENIORITIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Inquadramento</label>
          <input className="input" value={form.inquadramento} onChange={e => setField('inquadramento', e.target.value)}
            placeholder="es. Quadro, Impiegato B2, Dirigente…" />
        </div>
        <div>
          <label className="label">Appartenenza</label>
          <input className="input" value={form.appartenenza} onChange={e => setField('appartenenza', e.target.value)}
            placeholder="es. Team Backend, Delivery Italia, PMO…" />
        </div>
        <div className="col-span-2">
          <label className="label">Email</label>
          <input type="email" className="input" value={form.email} onChange={e => setField('email', e.target.value)} />
        </div>

        {/* Tariffe */}
        <div>
          <label className="label">Tariffa oraria (€/ora)</label>
          <input
            type="number" min={0} step={0.01} className="input"
            value={form.hourly_rate}
            onChange={e => handleHourlyChange(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="label">
            Tariffa giornaliera (€/giorno)
            <span className="text-slate-500 font-normal ml-1">= oraria × {hoursPerDay}h</span>
          </label>
          <input
            type="number" min={0} step={0.01} className="input"
            value={form.daily_rate}
            onChange={e => handleDailyChange(parseFloat(e.target.value) || 0)}
          />
        </div>

        <div>
          <label className="label">FTE (0–1)</label>
          <input type="number" min={0} max={1} step={0.1} className="input" value={form.fte}
            onChange={e => setField('fte', parseFloat(e.target.value) || 1)} />
        </div>
        <div>
          <label className="label">Colore</label>
          <div className="flex gap-2 flex-wrap mt-1">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setField('color', c)}
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
