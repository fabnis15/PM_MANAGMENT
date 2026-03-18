import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import { useStore } from '../../store/useStore'
import { Loader2 } from 'lucide-react'

export default function Layout({ children }: { children: ReactNode }) {
  const loading = useStore(s => s.loading)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={32} className="animate-spin text-blue-500" />
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  )
}
