import type { TimelineEvent } from '../lib/api'

interface Props {
  events: TimelineEvent[]
  onEventClick?: (event: TimelineEvent) => void
  editMode?: boolean
  onDeleteEvent?: (index: number) => void
}

export default function Timeline({ events, onEventClick, editMode, onDeleteEvent }: Props) {
  if (!events.length) return (
    <p className="text-gray-400 dark:text-[#475569] text-sm font-mono">// No timeline events recorded.</p>
  )

  return (
    <div className="relative pl-8">
      <div className="absolute left-2.5 top-0 bottom-0 w-px"
        style={{ background: 'linear-gradient(180deg, #22C55E, rgba(34,197,94,0.1))' }} />

      {events.map((ev, i) => (
        <div
          key={i}
          className={`relative mb-5 fade-in-up ${onEventClick && !editMode ? 'cursor-pointer group' : ''}`}
          style={{ animationDelay: `${i * 0.05}s` }}
          onClick={() => { if (!editMode) onEventClick?.(ev) }}
        >
          {/* Dot */}
          <div className={`absolute -left-6 top-1 w-3 h-3 rounded-full border bg-white dark:bg-[#020617] flex items-center justify-center transition-colors duration-150 ${onEventClick && !editMode ? 'border-green-500 group-hover:border-green-400 group-hover:bg-green-500/10' : 'border-green-500'}`}>
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          </div>

          {/* Time, MITRE, tool source, delete button */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-xs font-mono text-gray-400 dark:text-[#475569]">{ev.time}</p>
            {ev.mitre_tactic && ev.mitre_technique && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border border-cyan-500/30 text-cyan-400 bg-cyan-500/10 tracking-widest uppercase ml-2">
                {ev.mitre_technique} : {ev.mitre_tactic}
              </span>
            )}
            {ev.tool_source && (
              <span className="px-1.5 py-0.5 rounded text-[9px] border border-purple-500/20 text-purple-400 font-mono">
                {ev.tool_source}
              </span>
            )}
            {editMode && onDeleteEvent && (
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteEvent(i); }}
                className="ml-auto flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors font-mono text-xs"
                title="Remove false positive"
              >✕</button>
            )}
          </div>

          <p className="text-sm text-gray-600 dark:text-[#94A3B8] leading-relaxed">{ev.event}</p>

          {onEventClick && !editMode && (
            <p className="text-[10px] text-gray-400 dark:text-[#334155] font-mono mt-1 group-hover:text-gray-600 dark:group-hover:text-[#475569] transition-colors">
              click to view evidence →
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
