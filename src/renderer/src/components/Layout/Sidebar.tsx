import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FolderKanban, Users, CalendarDays,
  Bell, Settings, Briefcase
} from 'lucide-react'
import { useStore } from '../../store/useStore'

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderKanban, label: 'Progetti' },
  { to: '/people', icon: Users, label: 'Persone' },
  { to: '/allocations', icon: CalendarDays, label: 'Allocazioni' },
  { to: '/alerts', icon: Bell, label: 'Alert' },
]

export default function Sidebar() {
  const alerts = useStore(s => s.alerts)
  const errorCount = alerts.filter(a => a.severity === 'error').length
  const totalAlerts = alerts.length

  return (
    <aside className="w-60 flex-shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-slate-700">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Briefcase size={16} className="text-white" />
        </div>
        <div>
          <div className="text-sm font-bold text-white">PM Manager</div>
          <div className="text-xs text-slate-400">People & Projects</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              isActive ? 'nav-item-active' : 'nav-item-inactive'
            }
          >
            <Icon size={18} />
            <span>{label}</span>
            {to === '/alerts' && totalAlerts > 0 && (
              <span className={`ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full ${
                errorCount > 0 ? 'bg-red-500 text-white' : 'bg-amber-500 text-slate-900'
              }`}>
                {totalAlerts}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4">
        <NavLink
          to="/settings"
          className={({ isActive }) => isActive ? 'nav-item-active' : 'nav-item-inactive'}
        >
          <Settings size={18} />
          <span>Impostazioni</span>
        </NavLink>
        <div className="mt-4 px-3 text-xs text-slate-500">v1.0.0</div>
      </div>
    </aside>
  )
}
