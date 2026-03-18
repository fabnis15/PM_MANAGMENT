import { useState } from 'react'
import { Milestone } from '../../types'

type FormData = Omit<Milestone, 'id' | 'created_at' | 'project_name' | 'project_color'>

interface Props {
  initial?: Milestone
  projectId: number
  onSave: (d: FormData) => void
  onCancel: () => void
}

export default function MilestoneForm({ initial, projectId, onSave, onCancel }: Props) {
  const [form, setForm] = useState<FormData>({
    project_id: initial?.project_id ?? projectId,
    name: initial?.name ?? '',
    due_date: initial?.due_date ?? '',
    completed: initial?.completed ? true : false,
    description: initial?.description ?? '',
  })

  const set = (k: keyof FormData, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); if (!form.name || !form.due_date) return; onSave(form) }}
      className="space-y-4">
      <div>
        <label className="label">Nome milestone *</label>
        <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
      </div>
      <div>
        <label className="label">Data scadenza *</label>
        <input type="date" className="input" value={form.due_date} onChange={e => set('due_date', e.target.value)} required />
      </div>
      <div>
        <label className="label">Descrizione</label>
        <textarea className="input resize-none min-h-[60px]" value={form.description}
          onChange={e => set('description', e.target.value)} />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="completed" checked={!!form.completed}
          onChange={e => set('completed', e.target.checked)}
          className="w-4 h-4 accent-blue-500" />
        <label htmlFor="completed" className="text-sm text-slate-300">Completata</label>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Annulla</button>
        <button type="submit" className="btn-primary">{initial ? 'Salva' : 'Crea'}</button>
      </div>
    </form>
  )
}
