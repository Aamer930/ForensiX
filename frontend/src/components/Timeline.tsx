interface TimelineEvent {
  time: string
  event: string
  mitre_tactic?: string
  mitre_technique?: string
  tool_source?: string
}

interface Props {
  events: TimelineEvent[]
  onEventClick?: (event: TimelineEvent) => void
}

export default function Timeline({ events, onEventClick }: Props) {
  if (!events.length) return (
    <p className="text-[#334155] text-sm font-mono">// No timeline events recorded.</p>
  )

  return (
    <div className="relative pl-8">
      <div className="absolute left-2.5 top-0 bottom-0 w-px"
        style={{ background: 'linear-gradient(180deg, #22C55E, rgba(34,197,94,0.1))' }} />

      {events.map((ev, i) => (
        <div
          key={i}
          className={`relative mb-5 fade-in-up ${onEventClick ? 'cursor-pointer group' : ''}`}
          style={{ animationDelay: `${i * 0.05}s` }}
          onClick={() => onEventClick?.(ev)}
        >
          {/* Dot */}
          <div className={`absolute -left-6 top-1 w-3 h-3 rounded-full border bg-[#020617] flex items-center justify-center transition-colors duration-150 ${onEventClick ? 'border-green-500 group-hover:border-green-400 group-hover:bg-green-500/10' : 'border-green-500'}`}>
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          </div>

          {/* Time, MITRE, tool source */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-xs font-mono text-[#475569]">{ev.time}</p>
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
          </div>

          <p className="text-sm text-[#94A3B8] leading-relaxed">{ev.event}</p>

          {onEventClick && (
            <p className="text-[10px] text-[#1E293B] font-mono mt-1 group-hover:text-[#334155] transition-colors">
              click to view evidence →
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
