interface Event { time: string; event: string; mitre_tactic?: string; mitre_technique?: string; }
interface Props  { events: Event[] }

export default function Timeline({ events }: Props) {
  if (!events.length) return (
    <p className="text-[#334155] text-sm font-mono">// No timeline events recorded.</p>
  )

  return (
    <div className="relative pl-8">
      {/* Vertical line */}
      <div className="absolute left-2.5 top-0 bottom-0 w-px"
        style={{ background: 'linear-gradient(180deg, #22C55E, rgba(34,197,94,0.1))' }} />

      {events.map((ev, i) => (
        <div key={i} className={`relative mb-5 fade-in-up`} style={{ animationDelay: `${i * 0.05}s` }}>
          {/* Dot */}
          <div className="absolute -left-6 top-1 w-3 h-3 rounded-full border border-green-500 bg-[#020617] flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          </div>

          {/* Time & MITRE Badges */}
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-mono text-[#475569]">{ev.time}</p>
            {ev.mitre_tactic && ev.mitre_technique && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border border-cyan-500/30 text-cyan-400 bg-cyan-500/10 tracking-widest uppercase ml-2">
                {ev.mitre_technique} : {ev.mitre_tactic}
              </span>
            )}
          </div>

          {/* Event */}
          <p className="text-sm text-[#94A3B8] leading-relaxed pl-0">{ev.event}</p>
        </div>
      ))}
    </div>
  )
}
