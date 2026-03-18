import { useMemo } from 'react'
import { useStore } from '../../store/useStore'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { FolderKanban, Users, Bell, TrendingUp, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns'
import { it } from 'date-fns/locale'

const STATUS_COLORS: Record<string, string> = {
  planning: '#8b5cf6',
  active: '#10b981',
  'on-hold': '#f59e0b',
  completed: '#3b82f6',
  cancelled: '#6b7280'
}
const STATUS_LABELS: Record<string, string> = {
  planning: 'Pianificazione',
  active: 'Attivo',
  'on-hold': 'In pausa',
  completed: 'Completato',
  cancelled: 'Annullato'
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: number | string; sub?: string; color: string
}) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-sm text-slate-400">{label}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { projects, people, allocations, milestones, alerts } = useStore()

  const today = new Date()

  // Project status distribution
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of projects) counts[p.status] = (counts[p.status] || 0) + 1
    return Object.entries(counts).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      color: STATUS_COLORS[status]
    }))
  }, [projects])

  // Team utilization this month
  const utilizationData = useMemo(() => {
    const year = today.getFullYear(), month = today.getMonth()
    const mStart = new Date(year, month, 1)
    const mEnd = new Date(year, month + 1, 0)
    return people.map(p => {
      const pa = allocations.filter(a =>
        a.person_id === p.id &&
        new Date(a.start_date) <= mEnd &&
        new Date(a.end_date) >= mStart
      )
      const total = pa.reduce((s, a) => s + a.percentage, 0)
      return { name: p.name.split(' ')[0], total, fill: total > 100 ? '#ef4444' : total > 80 ? '#f59e0b' : '#10b981' }
    }).sort((a, b) => b.total - a.total)
  }, [people, allocations, today])

  // Upcoming milestones (next 30 days)
  const upcomingMilestones = useMemo(() =>
    milestones
      .filter(m => !m.completed)
      .filter(m => {
        const d = parseISO(m.due_date)
        return isAfter(d, today) && isBefore(d, addDays(today, 30))
      })
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, 6),
    [milestones, today]
  )

  // Budget overview (top 5 active projects with budget)
  const budgetData = useMemo(() => {
    return projects
      .filter(p => p.status === 'active' && p.budget_total > 0)
      .map(p => {
        const pa = allocations.filter(a => a.project_id === p.id)
        const cost = pa.reduce((s, a) => {
          const person = people.find(x => x.id === a.person_id)
          if (!person) return s
          const days = Math.max(0, Math.ceil((new Date(a.end_date).getTime() - new Date(a.start_date).getTime()) / 86400000) * 5 / 7)
          return s + days * person.daily_rate * (a.percentage / 100)
        }, 0)
        return {
          name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
          budget: p.budget_total,
          stimato: Math.round(cost),
          pct: p.budget_total > 0 ? Math.round((cost / p.budget_total) * 100) : 0
        }
      })
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 6)
  }, [projects, allocations, people])

  const activeProjects = projects.filter(p => p.status === 'active').length
  const errorAlerts = alerts.filter(a => a.severity === 'error').length

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">
          {format(today, "EEEE d MMMM yyyy", { locale: it })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={FolderKanban} label="Progetti attivi" value={activeProjects} sub={`${projects.length} totali`} color="bg-blue-600" />
        <StatCard icon={Users} label="Persone" value={people.length} color="bg-emerald-600" />
        <StatCard icon={Bell} label="Alert aperti" value={alerts.length} sub={errorCount(errorAlerts)} color={errorAlerts > 0 ? 'bg-red-600' : 'bg-amber-600'} />
        <StatCard icon={TrendingUp} label="Milestone (30gg)" value={upcomingMilestones.length} color="bg-violet-600" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Status Pie */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Progetti per stato</h3>
          {statusData.length === 0
            ? <EmptyChart />
            : <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                    dataKey="value" nameKey="name">
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
          }
        </div>

        {/* Utilization Bar */}
        <div className="card col-span-2">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Utilizzo team — mese corrente</h3>
          {utilizationData.length === 0
            ? <EmptyChart />
            : <ResponsiveContainer width="100%" height={180}>
                <BarChart data={utilizationData} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <XAxis type="number" domain={[0, 120]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} width={65} />
                  <Tooltip
                    formatter={(v) => [`${v}%`, 'Allocazione']}
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {utilizationData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      {/* Budget + Milestones */}
      <div className="grid grid-cols-2 gap-4">
        {/* Budget */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Budget vs Costo stimato</h3>
          {budgetData.length === 0
            ? <EmptyChart label="Nessun progetto attivo con budget" />
            : <ResponsiveContainer width="100%" height={200}>
                <BarChart data={budgetData} margin={{ left: 0, right: 10 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [`€${v.toLocaleString('it-IT')}`, '']}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="budget" name="Budget" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="stimato" name="Stimato" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </div>

        {/* Upcoming milestones */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Milestone prossime 30 giorni</h3>
          {upcomingMilestones.length === 0
            ? <EmptyChart label="Nessuna milestone in scadenza" />
            : <div className="space-y-2">
                {upcomingMilestones.map(ms => {
                  const d = parseISO(ms.due_date)
                  const daysLeft = Math.ceil((d.getTime() - today.getTime()) / 86400000)
                  return (
                    <div key={ms.id} className="flex items-center gap-3 py-2 border-b border-slate-700/50 last:border-0">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: ms.project_color || '#3b82f6' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">{ms.name}</div>
                        <div className="text-xs text-slate-400">{ms.project_name}</div>
                      </div>
                      <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        daysLeft <= 3 ? 'bg-red-500/20 text-red-400' :
                        daysLeft <= 7 ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {daysLeft === 0 ? 'Oggi' : `${daysLeft}gg`}
                      </div>
                    </div>
                  )
                })}
              </div>
          }
        </div>
      </div>

      {/* Active alerts preview */}
      {alerts.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Alert attivi</h3>
          <div className="space-y-2">
            {alerts.slice(0, 4).map(a => (
              <div key={a.id} className={`flex items-start gap-3 p-3 rounded-lg ${
                a.severity === 'error' ? 'bg-red-500/10 border border-red-500/20' :
                'bg-amber-500/10 border border-amber-500/20'
              }`}>
                <AlertTriangle size={14} className={a.severity === 'error' ? 'text-red-400 mt-0.5' : 'text-amber-400 mt-0.5'} />
                <div>
                  <div className="text-sm font-medium text-white">{a.title}</div>
                  <div className="text-xs text-slate-400">{a.message}</div>
                </div>
              </div>
            ))}
            {alerts.length > 4 && (
              <div className="text-xs text-slate-400 text-center pt-1">
                +{alerts.length - 4} altri alert
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyChart({ label = 'Nessun dato disponibile' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-32 text-slate-500">
      <CheckCircle2 size={24} className="mb-2 opacity-30" />
      <span className="text-xs">{label}</span>
    </div>
  )
}

function errorCount(n: number) {
  if (n === 0) return undefined
  return `${n} critic${n === 1 ? 'o' : 'i'}`
}
