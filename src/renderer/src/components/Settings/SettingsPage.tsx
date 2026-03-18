import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { Settings as SettingsType } from '../../types'
import { Save, CheckCircle2 } from 'lucide-react'

export default function SettingsPage() {
  const { settings, saveSettings } = useStore()
  const [form, setForm] = useState<SettingsType>(settings)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setForm(settings) }, [settings])

  const set = (k: keyof SettingsType, v: number) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    await saveSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-6 max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Impostazioni</h1>
        <p className="text-sm text-slate-400">Configura soglie e preferenze dell'app</p>
      </div>

      <div className="card space-y-6">
        <h2 className="text-sm font-semibold text-slate-300 border-b border-slate-700 pb-3">Soglie Alert</h2>

        <div>
          <label className="label">Soglia sovra-allocazione (%)</label>
          <p className="text-xs text-slate-500 mb-2">Alert quando una persona supera questa % di allocazione in un mese</p>
          <input type="number" className="input w-32" min={50} max={200} step={5}
            value={form.overallocation_threshold}
            onChange={e => set('overallocation_threshold', parseInt(e.target.value) || 100)} />
        </div>

        <div>
          <label className="label">Soglia avvertimento budget (%)</label>
          <p className="text-xs text-slate-500 mb-2">Alert quando il costo stimato supera questa % del budget</p>
          <input type="number" className="input w-32" min={50} max={100} step={5}
            value={form.budget_warning_threshold}
            onChange={e => set('budget_warning_threshold', parseInt(e.target.value) || 80)} />
        </div>

        <div>
          <label className="label">Giorni avviso scadenze</label>
          <p className="text-xs text-slate-500 mb-2">Alert per milestone e progetti che scadono entro N giorni</p>
          <input type="number" className="input w-32" min={1} max={60} step={1}
            value={form.deadline_warning_days}
            onChange={e => set('deadline_warning_days', parseInt(e.target.value) || 14)} />
        </div>
      </div>

      <div className="card space-y-6">
        <h2 className="text-sm font-semibold text-slate-300 border-b border-slate-700 pb-3">Parametri Lavoro</h2>

        <div>
          <label className="label">Giorni lavorativi per settimana</label>
          <input type="number" className="input w-32" min={1} max={7} step={1}
            value={form.working_days_per_week}
            onChange={e => set('working_days_per_week', parseInt(e.target.value) || 5)} />
        </div>

        <div>
          <label className="label">Ore lavorative per giorno</label>
          <input type="number" className="input w-32" min={1} max={24} step={1}
            value={form.working_hours_per_day}
            onChange={e => set('working_hours_per_day', parseInt(e.target.value) || 8)} />
        </div>
      </div>

      <button onClick={handleSave}
        className={`btn ${saved ? 'bg-emerald-600 hover:bg-emerald-600 text-white' : 'btn-primary'}`}>
        {saved ? <><CheckCircle2 size={16} /> Salvato!</> : <><Save size={16} /> Salva impostazioni</>}
      </button>
    </div>
  )
}
