import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import {
  addMonths, startOfMonth, endOfMonth, eachMonthOfInterval,
  differenceInDays, parseISO, format, isWithinInterval, isSameMonth
} from 'date-fns'
import { it } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

type GroupBy = 'person' | 'project'
type Zoom = 3 | 6 | 12

interface GanttItem {
  id: number
  label: string
  color: string
  start_date: string
  end_date: string
  percentage: number
  lane: number
}

interface GanttRow {
  id: number
  name: string
  color: string
  items: GanttItem[]
  lanes: number
}

// Assign items to non-overlapping lanes
function assignLanes(items: Omit<GanttItem, 'lane'>[]): GanttItem[] {
  const sorted = [...items].sort((a, b) => a.start_date.localeCompare(b.start_date))
  const laneEnds: string[] = []
  return sorted.map(item => {
    let lane = laneEnds.findIndex(end => end < item.start_date)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = item.end_date
    return { ...item, lane }
  })
}

export default function GanttView() {
  const { allocations, people, projects } = useStore()
  const [groupBy, setGroupBy] = useState<GroupBy>('person')
  const [zoom, setZoom] = useState<Zoom>(6)
  const today = new Date()
  const [viewStart, setViewStart] = useState(startOfMonth(today))

  const viewEnd = endOfMonth(addMonths(viewStart, zoom - 1))
  const totalDays = differenceInDays(viewEnd, viewStart) + 1
  const months = eachMonthOfInterval({ start: viewStart, end: viewEnd })

  const todayPct = (() => {
    if (today < viewStart || today > viewEnd) return null
    return (differenceInDays(today, viewStart) / totalDays) * 100
  })()

  const getBarStyle = (startDate: string, endDate: string) => {
    const s = parseISO(startDate)
    const e = parseISO(endDate)
    const clampedS = s < viewStart ? viewStart : s
    const clampedE = e > viewEnd ? viewEnd : e
    if (clampedS > viewEnd || clampedE < viewStart) return null
    const left = (differenceInDays(clampedS, viewStart) / totalDays) * 100
    const width = ((differenceInDays(clampedE, clampedS) + 1) / totalDays) * 100
    return { left: `${left}%`, width: `${Math.max(width, 0.3)}%` }
  }

  const rows: GanttRow[] = useMemo(() => {
    if (groupBy === 'person') {
      return people.map(person => {
        const raw = allocations
          .filter(a => a.person_id === person.id)
          .map(a => ({
            id: a.id,
            label: a.project_name || '—',
            color: a.project_color || '#3b82f6',
            start_date: a.start_date,
            end_date: a.end_date,
            percentage: a.percentage,
          }))
        const items = assignLanes(raw)
        return { id: person.id, name: person.name, color: person.color, items, lanes: Math.max(1, ...items.map(i => i.lane + 1), 1) }
      })
    } else {
      return projects
        .filter(p => p.status !== 'cancelled')
        .map(project => {
          const raw = allocations
            .filter(a => a.project_id === project.id)
            .map(a => ({
              id: a.id,
              label: a.person_name || '—',
              color: a.person_color || '#3b82f6',
              start_date: a.start_date,
              end_date: a.end_date,
              percentage: a.percentage,
            }))
          const items = assignLanes(raw)
          return { id: project.id, name: project.name, color: project.color, items, lanes: Math.max(1, ...items.map(i => i.lane + 1), 1) }
        })
    }
  }, [groupBy, people, projects, allocations])

  const LANE_H = 28
  const ROW_PAD = 8

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* GroupBy */}
        <div className="flex bg-slate-700/60 border border-slate-600 rounded-lg p-1 gap-1">
          {(['person', 'project'] as GroupBy[]).map(g => (
            <button key={g} onClick={() => setGroupBy(g)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                groupBy === g ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}>
              {g === 'person' ? 'Per persona' : 'Per progetto'}
            </button>
          ))}
        </div>

        {/* Zoom */}
        <div className="flex bg-slate-700/60 border border-slate-600 rounded-lg p-1 gap-1">
          {([3, 6, 12] as Zoom[]).map(z => (
            <button key={z} onClick={() => setZoom(z)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                zoom === z ? 'bg-slate-500 text-white' : 'text-slate-400 hover:text-white'
              }`}>
              {z}m
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button className="btn-ghost p-1.5" onClick={() => setViewStart(s => addMonths(s, -Math.floor(zoom / 2)))}>
            <ChevronLeft size={15} />
          </button>
          <span className="text-xs text-slate-300 min-w-[140px] text-center">
            {format(viewStart, 'MMM yyyy', { locale: it })} – {format(viewEnd, 'MMM yyyy', { locale: it })}
          </span>
          <button className="btn-ghost p-1.5" onClick={() => setViewStart(s => addMonths(s, Math.floor(zoom / 2)))}>
            <ChevronRight size={15} />
          </button>
        </div>

        <button className="btn-ghost py-1 px-2 text-xs gap-1.5"
          onClick={() => setViewStart(startOfMonth(today))}>
          <Calendar size={13} /> Oggi
        </button>
      </div>

      {/* Gantt chart */}
      <div className="card p-0 overflow-hidden">
        {rows.length === 0 && (
          <div className="text-center py-16 text-slate-500 text-sm">
            Nessun dato da visualizzare
          </div>
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <div style={{ minWidth: `${Math.max(zoom * 120, 600)}px` }}>

              {/* Month header */}
              <div className="flex border-b border-slate-700 bg-slate-700/30 sticky top-0 z-10">
                <div className="w-44 flex-shrink-0 px-4 py-2 text-xs font-semibold text-slate-400 border-r border-slate-700">
                  {groupBy === 'person' ? 'Persona' : 'Progetto'}
                </div>
                <div className="flex-1 relative h-8">
                  {months.map((m, i) => {
                    const pct = (i / zoom) * 100
                    const isCurrentMonth = isSameMonth(m, today)
                    return (
                      <div key={i}
                        className={`absolute top-0 bottom-0 flex items-center justify-center text-xs border-r border-slate-700/60 ${
                          isCurrentMonth ? 'text-blue-400 font-semibold' : 'text-slate-400'
                        }`}
                        style={{ left: `${pct}%`, width: `${100 / zoom}%` }}>
                        {format(m, zoom <= 6 ? 'MMM yyyy' : 'MMM', { locale: it })}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Rows */}
              {rows.map(row => {
                const rowH = row.lanes * LANE_H + ROW_PAD * 2
                return (
                  <div key={row.id} className="flex border-b border-slate-700/40 hover:bg-slate-700/10 transition-colors">
                    {/* Label */}
                    <div className="w-44 flex-shrink-0 flex items-center gap-2 px-4 border-r border-slate-700/60"
                      style={{ minHeight: rowH }}>
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: row.color }} />
                      <span className="text-xs text-slate-300 truncate">{row.name}</span>
                    </div>

                    {/* Timeline */}
                    <div className="flex-1 relative" style={{ height: rowH }}>

                      {/* Month grid lines */}
                      {months.map((_, i) => i > 0 && (
                        <div key={i} className="absolute top-0 bottom-0 border-l border-slate-700/30"
                          style={{ left: `${(i / zoom) * 100}%` }} />
                      ))}

                      {/* Today line */}
                      {todayPct !== null && (
                        <div className="absolute top-0 bottom-0 w-px bg-red-400/70 z-10"
                          style={{ left: `${todayPct}%` }} />
                      )}

                      {/* Bars */}
                      {row.items.map(item => {
                        const style = getBarStyle(item.start_date, item.end_date)
                        if (!style) return null
                        const top = ROW_PAD + item.lane * LANE_H
                        return (
                          <div key={item.id}
                            className="absolute rounded flex items-center overflow-hidden cursor-default group"
                            style={{
                              ...style,
                              top,
                              height: LANE_H - 4,
                              background: item.color + 'cc',
                              border: `1px solid ${item.color}`,
                            }}
                            title={`${item.label}\n${item.percentage}% · ${item.start_date} → ${item.end_date}`}>
                            <span className="px-1.5 text-xs text-white font-medium truncate leading-none select-none">
                              {item.label} <span className="opacity-70">{item.percentage}%</span>
                            </span>
                            {/* Tooltip */}
                            <div className="hidden group-hover:flex absolute bottom-full left-0 mb-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white shadow-xl z-20 whitespace-nowrap flex-col gap-0.5">
                              <span className="font-semibold">{item.label}</span>
                              <span className="text-slate-400">{item.percentage}% · {item.start_date} → {item.end_date}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* Legend: today */}
              {todayPct !== null && (
                <div className="flex items-center gap-2 px-4 py-2 border-t border-slate-700/40">
                  <div className="w-3 h-px bg-red-400" />
                  <span className="text-xs text-slate-500">Oggi — {format(today, 'dd/MM/yyyy')}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
