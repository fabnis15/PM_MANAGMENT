import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Dashboard from './components/Dashboard/Dashboard'
import ProjectsPage from './components/Projects/ProjectsPage'
import PeoplePage from './components/People/PeoplePage'
import AllocationsPage from './components/Allocations/AllocationsPage'
import AlertsPage from './components/Alerts/AlertsPage'
import SettingsPage from './components/Settings/SettingsPage'
import CalendarPage from './components/Calendar/CalendarPage'
import { useStore } from './store/useStore'

export default function App() {
  const loadAll = useStore(s => s.loadAll)

  useEffect(() => {
    loadAll()
  }, [loadAll])

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/people" element={<PeoplePage />} />
        <Route path="/allocations" element={<AllocationsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  )
}
