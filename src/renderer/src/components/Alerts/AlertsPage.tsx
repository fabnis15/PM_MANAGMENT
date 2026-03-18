import { useStore } from '../../store/useStore'
import { AlertTriangle, AlertCircle, Info, Bell } from 'lucide-react'
import { Alert, AlertType } from '../../types'

const TYPE_LABELS: Record<AlertType, string> = {
  overallocation: 'Sovra-allocazione',
  budget: 'Budget',
  deadline: 'Scadenza progetto',
  milestone: 'Milestone',
}

const TYPE_COLORS: Record<AlertType, string> = {
  overallocation: 'bg-red-500/10 border-red-500/20',
  budget: 'bg-amber-500/10 border-amber-500/20',
  deadline: 'bg-orange-500/10 border-orange-500/20',
  milestone: 'bg-blue-500/10 border-blue-500/20',
}

function AlertIcon({ severity }: { severity: Alert['severity'] }) {
  if (severity === 'error') return <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
  if (severity === 'warning') return <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
  return <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
}

export default function AlertsPage() {
  const alerts = useStore(s => s.alerts)

  const errors = alerts.filter(a => a.severity === 'error')
  const warnings = alerts.filter(a => a.severity === 'warning')

  const grouped = (Object.keys(TYPE_LABELS) as AlertType[]).reduce((acc, type) => {
    acc[type] = alerts.filter(a => a.type === type)
    return acc
  }, {} as Record<AlertType, Alert[]>)

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Alert</h1>
        <p className="text-sm text-slate-400">
          {errors.length} critici · {warnings.length} avvertimenti
        </p>
      </div>

      {alerts.length === 0 && (
        <div className="card text-center py-16">
          <Bell size={40} className="mx-auto mb-3 text-slate-600" />
          <p className="text-slate-400 font-medium">Nessun alert attivo</p>
          <p className="text-slate-500 text-sm mt-1">Tutto nella norma!</p>
        </div>
      )}

      {(Object.entries(grouped) as [AlertType, Alert[]][]).map(([type, typeAlerts]) => {
        if (typeAlerts.length === 0) return null
        return (
          <div key={type}>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {TYPE_LABELS[type]} ({typeAlerts.length})
            </h2>
            <div className="space-y-2">
              {typeAlerts.map(alert => (
                <div key={alert.id}
                  className={`flex items-start gap-3 p-4 rounded-xl border ${TYPE_COLORS[type]}`}>
                  <AlertIcon severity={alert.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{alert.title}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        alert.severity === 'error'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {alert.severity === 'error' ? 'Critico' : 'Avvertimento'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5">{alert.message}</p>
                    {alert.date && (
                      <p className="text-xs text-slate-500 mt-1">{alert.date}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
