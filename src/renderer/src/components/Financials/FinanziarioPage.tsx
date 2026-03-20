import { useState, useMemo, useCallback } from 'react'
import { useStore, getWorkingDays } from '../../store/useStore'
import { MonthlyRevenue } from '../../types'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const MONTHS_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
]

function getQuarter(month: number): number {
  return Math.ceil(month / 3)
}

interface FinancialRow {
  projectId: number
  projectName: string
  projectColor: string
  client: string
  wbs_opx: string
  tipo_attivita: string
  year: number
  month: number
  quarter: number
  stima: number
  revenue: number
  aop: number
  costi: number
  margine: number
  aopPct: number
  risorse: string[]
}

interface EditingCell {
  rowKey: string
  field: 'stima' | 'revenue' | 'aop'
}

const fmt = (n: number) =>
  n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function FinanziarioPage() {
  const { projects, allocations, people, holidays, leaves, monthlyRevenues } = useStore()
  const upsertMonthlyRevenue = useStore(s => s.upsertMonthlyRevenue)

  const currentYear = new Date().getFullYear()
  const [filterYear, setFilterYear] = useState<number>(currentYear)
  const [filterQuarters, setFilterQuarters] = useState<number[]>([])
  const [filterMonths, setFilterMonths] = useState<number[]>([])
  const [filterClient, setFilterClient] = useState('')
  const [filterProject, setFilterProject] = useState<number | ''>('')
  const [groupBy, setGroupBy] = useState<'month' | 'project' | 'client'>('month')

  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editValue, setEditValue] = useState('')

  const availableYears = useMemo(() => {
    const years = new Set<number>()
    years.add(currentYear)
    allocations.forEach(a => {
      years.add(new Date(a.start_date).getFullYear())
      years.add(new Date(a.end_date).getFullYear())
    })
    monthlyRevenues.forEach(r => years.add(r.year))
    return Array.from(years).sort()
  }, [allocations, monthlyRevenues, currentYear])

  // Build all rows from allocations + monthly_revenue
  const allRows = useMemo(() => {
    const rowMap = new Map<string, FinancialRow>()

    // From allocations
    for (const a of allocations) {
      const project = projects.find(p => p.id === a.project_id)
      if (!project) continue
      const person = people.find(p => p.id === a.person_id)

      const s = new Date(a.start_date)
      const e = new Date(a.end_date)
      const cur = new Date(s.getFullYear(), s.getMonth(), 1)
      const end = new Date(e.getFullYear(), e.getMonth(), 1)

      while (cur <= end) {
        const year = cur.getFullYear()
        const month = cur.getMonth() + 1
        const key = `${a.project_id}-${year}-${month}`

        if (!rowMap.has(key)) {
          rowMap.set(key, {
            projectId: project.id,
            projectName: project.name,
            projectColor: project.color,
            client: project.client,
            wbs_opx: project.wbs_opx,
            tipo_attivita: project.tipo_attivita,
            year,
            month,
            quarter: getQuarter(month),
            stima: 0,
            revenue: 0,
            aop: 0,
            costi: 0,
            margine: 0,
            aopPct: 0,
            risorse: []
          })
        }

        if (person) {
          const mStart = `${year}-${String(month).padStart(2, '0')}-01`
          const lastDay = new Date(year, month, 0).getDate()
          const mEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
          const effectiveStart = a.start_date > mStart ? a.start_date : mStart
          const effectiveEnd = a.end_date < mEnd ? a.end_date : mEnd
          const personLeaves = leaves.filter(l => l.person_id === a.person_id)
          const days = getWorkingDays(effectiveStart, effectiveEnd, holidays, personLeaves)
          const cost = days * person.daily_rate * (a.percentage / 100)

          const row = rowMap.get(key)!
          row.costi += cost
          if (!row.risorse.includes(person.name)) row.risorse.push(person.name)
        }

        cur.setMonth(cur.getMonth() + 1)
      }
    }

    // Overlay stima/revenue/aop from monthly_revenue
    for (const mr of monthlyRevenues) {
      const project = projects.find(p => p.id === mr.project_id)
      if (!project) continue
      const key = `${mr.project_id}-${mr.year}-${mr.month}`

      if (!rowMap.has(key)) {
        rowMap.set(key, {
          projectId: project.id,
          projectName: project.name,
          projectColor: project.color,
          client: project.client,
          wbs_opx: project.wbs_opx,
          tipo_attivita: project.tipo_attivita,
          year: mr.year,
          month: mr.month,
          quarter: getQuarter(mr.month),
          stima: 0,
          revenue: 0,
          aop: 0,
          costi: 0,
          margine: 0,
          aopPct: 0,
          risorse: []
        })
      }

      const row = rowMap.get(key)!
      row.stima = mr.stima
      row.revenue = mr.revenue
      row.aop = mr.aop
    }

    // Compute derived fields
    for (const row of rowMap.values()) {
      row.margine = row.revenue > 0 ? ((row.revenue - row.costi) / row.revenue) * 100 : 0
      row.aopPct = row.aop > 0 ? (row.costi / row.aop) * 100 : 0
    }

    return Array.from(rowMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      if (a.month !== b.month) return a.month - b.month
      if (a.client !== b.client) return a.client.localeCompare(b.client)
      return a.projectName.localeCompare(b.projectName)
    })
  }, [allocations, projects, people, holidays, leaves, monthlyRevenues])

  const filteredRows = useMemo(() => {
    return allRows.filter(r => {
      if (filterYear && r.year !== filterYear) return false
      if (filterQuarters.length > 0 && !filterQuarters.includes(r.quarter)) return false
      if (filterMonths.length > 0 && !filterMonths.includes(r.month)) return false
      if (filterClient && r.client !== filterClient) return false
      if (filterProject !== '' && r.projectId !== filterProject) return false
      return true
    })
  }, [allRows, filterYear, filterQuarters, filterMonths, filterClient, filterProject])

  const totals = useMemo(() => {
    const stimaTot = filteredRows.reduce((s, r) => s + r.stima, 0)
    const revenueTot = filteredRows.reduce((s, r) => s + r.revenue, 0)
    const costiTot = filteredRows.reduce((s, r) => s + r.costi, 0)
    const aopTot = filteredRows.reduce((s, r) => s + r.aop, 0)
    const margineTot = revenueTot > 0 ? ((revenueTot - costiTot) / revenueTot) * 100 : 0
    const aopPctTot = aopTot > 0 ? (costiTot / aopTot) * 100 : 0
    return { stimaTot, revenueTot, costiTot, aopTot, margineTot, aopPctTot }
  }, [filteredRows])

  // Chart data grouped by month
  const chartData = useMemo(() => {
    const byMonth = new Map<string, { label: string; revenue: number; costi: number; aop: number; stima: number }>()
    for (const r of filteredRows) {
      const key = `${r.year}-${String(r.month).padStart(2, '0')}`
      if (!byMonth.has(key)) {
        byMonth.set(key, {
          label: `${MONTHS_IT[r.month - 1].slice(0, 3)} ${r.year}`,
          revenue: 0, costi: 0, aop: 0, stima: 0
        })
      }
      const e = byMonth.get(key)!
      e.revenue += r.revenue
      e.costi += r.costi
      e.aop += r.aop
      e.stima += r.stima
    }
    return Array.from(byMonth.values())
  }, [filteredRows])

  const clients = useMemo(() =>
    [...new Set(projects.map(p => p.client).filter(Boolean))].sort(),
    [projects]
  )

  const toggleQuarter = (q: number) =>
    setFilterQuarters(prev => prev.includes(q) ? prev.filter(x => x !== q) : [...prev, q])

  const toggleMonth = (m: number) =>
    setFilterMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])

  const startEdit = useCallback((rowKey: string, field: 'stima' | 'revenue' | 'aop', currentValue: number) => {
    setEditingCell({ rowKey, field })
    setEditValue(currentValue === 0 ? '' : String(currentValue))
  }, [])

  const commitEdit = useCallback(async (row: FinancialRow) => {
    if (!editingCell) return
    const newVal = parseFloat(editValue) || 0
    const existing = monthlyRevenues.find(
      mr => mr.project_id === row.projectId && mr.year === row.year && mr.month === row.month
    )
    const data: Omit<MonthlyRevenue, 'id' | 'created_at'> = {
      project_id: row.projectId,
      year: row.year,
      month: row.month,
      stima: existing?.stima ?? 0,
      revenue: existing?.revenue ?? 0,
      aop: existing?.aop ?? 0,
      notes: existing?.notes ?? '',
      [editingCell.field]: newVal
    }
    await upsertMonthlyRevenue(data)
    setEditingCell(null)
  }, [editingCell, editValue, monthlyRevenues, upsertMonthlyRevenue])

  const cancelEdit = useCallback(() => setEditingCell(null), [])

  const hasFilters = filterQuarters.length > 0 || filterMonths.length > 0 || filterClient !== '' || filterProject !== ''

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">Controllo Economico</h1>
        <p className="text-sm text-slate-400 mt-0.5">Revenue, Costi e AOP per progetto e periodo — clicca su Stima / Revenue / AOP per modificare</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

        {/* ── Filters ── */}
        <div className="card p-4">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Anno */}
            <div>
              <label className="label">Anno</label>
              <select className="input" value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Quarter */}
            <div>
              <label className="label">Quarter</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(q => (
                  <button
                    key={q}
                    onClick={() => toggleQuarter(q)}
                    className={`px-3 py-1.5 text-sm rounded font-medium transition-colors ${
                      filterQuarters.includes(q)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Q{q}
                  </button>
                ))}
              </div>
            </div>

            {/* Mese */}
            <div>
              <label className="label">Mese</label>
              <div className="flex gap-1 flex-wrap" style={{ maxWidth: 300 }}>
                {MONTHS_IT.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => toggleMonth(i + 1)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      filterMonths.includes(i + 1)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {m.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Cliente */}
            <div>
              <label className="label">Cliente</label>
              <select className="input" value={filterClient} onChange={e => setFilterClient(e.target.value)}>
                <option value="">Tutti</option>
                {clients.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Progetto */}
            <div>
              <label className="label">Progetto</label>
              <select
                className="input"
                value={filterProject}
                onChange={e => setFilterProject(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">Tutti</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {hasFilters && (
              <button
                onClick={() => { setFilterQuarters([]); setFilterMonths([]); setFilterClient(''); setFilterProject('') }}
                className="btn btn-ghost text-sm"
              >
                Reset filtri
              </button>
            )}
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="card p-4">
            <div className="text-xs text-slate-400 mb-1">Stima Tot</div>
            <div className="text-lg font-bold text-slate-300">€ {fmt(totals.stimaTot)}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-400 mb-1">Revenue Tot</div>
            <div className="text-lg font-bold text-green-400">€ {fmt(totals.revenueTot)}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-400 mb-1">Costi Tot</div>
            <div className="text-lg font-bold text-red-400">€ {fmt(totals.costiTot)}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-400 mb-1">AOP Tot</div>
            <div className="text-lg font-bold text-blue-400">€ {fmt(totals.aopTot)}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-400 mb-1">Margine %</div>
            <div className={`text-lg font-bold ${
              totals.revenueTot === 0 ? 'text-slate-500' :
              totals.margineTot >= 30 ? 'text-green-400' :
              totals.margineTot >= 10 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {totals.revenueTot > 0 ? `${totals.margineTot.toFixed(1)}%` : '—'}
            </div>
          </div>
        </div>

        {/* ── Chart ── */}
        {chartData.length > 0 && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-slate-300">Andamento mensile</div>
              <div className="flex gap-1">
                {(['month'] as const).map(g => (
                  <button key={g} onClick={() => setGroupBy(g)}
                    className={`px-2 py-1 text-xs rounded ${groupBy === g ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                    Per mese
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#f1f5f9' }}
                  formatter={(v: number) => [`€ ${fmt(v)}`, undefined]}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Bar dataKey="stima" name="Stima" fill="#64748b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="revenue" name="Revenue" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="costi" name="Costi" fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="aop" name="AOP" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Table ── */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/50">
                  <th className="text-left px-3 py-2.5 text-slate-400 font-medium whitespace-nowrap">Anno</th>
                  <th className="text-left px-3 py-2.5 text-slate-400 font-medium whitespace-nowrap">Q</th>
                  <th className="text-left px-3 py-2.5 text-slate-400 font-medium whitespace-nowrap">Mese</th>
                  <th className="text-left px-3 py-2.5 text-slate-400 font-medium whitespace-nowrap">Cliente</th>
                  <th className="text-left px-3 py-2.5 text-slate-400 font-medium whitespace-nowrap">Progetto</th>
                  <th className="text-left px-3 py-2.5 text-slate-400 font-medium whitespace-nowrap">WBS/OPX</th>
                  <th className="text-right px-3 py-2.5 text-slate-400 font-medium whitespace-nowrap">Stima (€)</th>
                  <th className="text-right px-3 py-2.5 text-slate-400 font-medium whitespace-nowrap">Revenue (€)</th>
                  <th className="text-right px-3 py-2.5 text-slate-400 font-medium whitespace-nowrap">Costi (€)</th>
                  <th className="text-right px-3 py-2.5 text-slate-400 font-medium whitespace-nowrap">AOP (€)</th>
                  <th className="text-right px-3 py-2.5 text-slate-400 font-medium whitespace-nowrap">Margine %</th>
                  <th className="text-right px-3 py-2.5 text-slate-400 font-medium whitespace-nowrap">AOP %</th>
                  <th className="text-left px-3 py-2.5 text-slate-400 font-medium whitespace-nowrap">Risorse</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-12 text-slate-500">
                      Nessun dato per il periodo selezionato.<br />
                      <span className="text-xs">Le righe vengono generate automaticamente dalle allocazioni. Clicca su Stima, Revenue o AOP per inserire i valori.</span>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map(row => {
                    const rowKey = `${row.projectId}-${row.year}-${row.month}`
                    return (
                      <tr key={rowKey} className="border-b border-slate-700/40 hover:bg-slate-700/20 transition-colors">
                        <td className="px-3 py-2.5 text-slate-300">{row.year}</td>
                        <td className="px-3 py-2.5 text-slate-400 font-medium">Q{row.quarter}</td>
                        <td className="px-3 py-2.5 text-slate-300">{MONTHS_IT[row.month - 1]}</td>
                        <td className="px-3 py-2.5 text-slate-300 max-w-[120px] truncate">{row.client || '—'}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: row.projectColor }} />
                            <span className="text-slate-300 truncate max-w-[130px]" title={row.projectName}>{row.projectName}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          {row.wbs_opx
                            ? <span className="font-mono text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">{row.wbs_opx}</span>
                            : <span className="text-slate-600">—</span>
                          }
                        </td>

                        <EditableCell rowKey={rowKey} field="stima" value={row.stima}
                          editingCell={editingCell} editValue={editValue} setEditValue={setEditValue}
                          onStart={startEdit} onCommit={() => commitEdit(row)} onCancel={cancelEdit} />

                        <EditableCell rowKey={rowKey} field="revenue" value={row.revenue}
                          editingCell={editingCell} editValue={editValue} setEditValue={setEditValue}
                          onStart={startEdit} onCommit={() => commitEdit(row)} onCancel={cancelEdit}
                          colorClass="text-green-400" />

                        {/* Costi - read only (calcolati) */}
                        <td className="px-3 py-2.5 text-right">
                          <span className={row.costi > 0 ? 'text-red-400 font-medium' : 'text-slate-600'}>
                            {row.costi > 0 ? fmt(row.costi) : '—'}
                          </span>
                        </td>

                        <EditableCell rowKey={rowKey} field="aop" value={row.aop}
                          editingCell={editingCell} editValue={editValue} setEditValue={setEditValue}
                          onStart={startEdit} onCommit={() => commitEdit(row)} onCancel={cancelEdit}
                          colorClass="text-blue-400" />

                        {/* Margine */}
                        <td className={`px-3 py-2.5 text-right font-medium ${
                          row.revenue === 0 ? 'text-slate-600' :
                          row.margine >= 30 ? 'text-green-400' :
                          row.margine >= 10 ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {row.revenue > 0 ? `${row.margine.toFixed(1)}%` : '—'}
                        </td>

                        {/* AOP % */}
                        <td className={`px-3 py-2.5 text-right font-medium ${
                          row.aop === 0 ? 'text-slate-600' :
                          row.aopPct <= 80 ? 'text-green-400' :
                          row.aopPct <= 100 ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {row.aop > 0 ? `${row.aopPct.toFixed(1)}%` : '—'}
                        </td>

                        {/* Risorse */}
                        <td className="px-3 py-2.5 text-xs max-w-[160px]">
                          <div className="flex flex-wrap gap-1">
                            {row.risorse.length > 0
                              ? row.risorse.map(r => (
                                <span key={r} className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded whitespace-nowrap">
                                  {r.split(' ')[0]}
                                </span>
                              ))
                              : <span className="text-slate-600">—</span>
                            }
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>

              {filteredRows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-600 bg-slate-800/80 font-bold">
                    <td colSpan={6} className="px-3 py-2.5 text-slate-400">Totali ({filteredRows.length} righe)</td>
                    <td className="px-3 py-2.5 text-right text-slate-300">{fmt(totals.stimaTot)}</td>
                    <td className="px-3 py-2.5 text-right text-green-400">{fmt(totals.revenueTot)}</td>
                    <td className="px-3 py-2.5 text-right text-red-400">{fmt(totals.costiTot)}</td>
                    <td className="px-3 py-2.5 text-right text-blue-400">{fmt(totals.aopTot)}</td>
                    <td className={`px-3 py-2.5 text-right ${
                      totals.revenueTot === 0 ? 'text-slate-600' :
                      totals.margineTot >= 30 ? 'text-green-400' :
                      totals.margineTot >= 10 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {totals.revenueTot > 0 ? `${totals.margineTot.toFixed(1)}%` : '—'}
                    </td>
                    <td className={`px-3 py-2.5 text-right ${
                      totals.aopTot === 0 ? 'text-slate-600' :
                      totals.aopPctTot <= 80 ? 'text-green-400' :
                      totals.aopPctTot <= 100 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {totals.aopTot > 0 ? `${totals.aopPctTot.toFixed(1)}%` : '—'}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Editable cell component ──────────────────────────────────────────────────

interface EditableCellProps {
  rowKey: string
  field: 'stima' | 'revenue' | 'aop'
  value: number
  editingCell: EditingCell | null
  editValue: string
  setEditValue: (v: string) => void
  onStart: (key: string, field: 'stima' | 'revenue' | 'aop', val: number) => void
  onCommit: () => void
  onCancel: () => void
  colorClass?: string
}

function EditableCell({
  rowKey, field, value, editingCell, editValue, setEditValue,
  onStart, onCommit, onCancel, colorClass = 'text-slate-300'
}: EditableCellProps) {
  const isEditing = editingCell?.rowKey === rowKey && editingCell?.field === field

  return (
    <td className="px-2 py-2 text-right">
      {isEditing ? (
        <input
          type="number"
          step="0.01"
          className="w-28 px-2 py-1 text-right text-sm bg-slate-700 border border-blue-500 rounded text-white focus:outline-none"
          value={editValue}
          autoFocus
          onChange={e => setEditValue(e.target.value)}
          onBlur={onCommit}
          onKeyDown={e => {
            if (e.key === 'Enter') onCommit()
            if (e.key === 'Escape') onCancel()
          }}
        />
      ) : (
        <span
          className={`cursor-pointer hover:bg-slate-700 px-1.5 py-0.5 rounded transition-colors ${value > 0 ? colorClass : 'text-slate-600 hover:text-slate-400'}`}
          onClick={() => onStart(rowKey, field, value)}
          title="Clicca per modificare"
        >
          {value > 0 ? fmt(value) : <span className="text-xs">+</span>}
        </span>
      )}
    </td>
  )
}
