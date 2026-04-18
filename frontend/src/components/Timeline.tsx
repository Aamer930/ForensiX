interface Event { time: string; event: string }
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

          {/* Time */}
          <p className="text-xs font-mono text-[#475569] mb-1">{ev.time}</p>

          {/* Event */}
          <p className="text-sm text-[#94A3B8] leading-relaxed pl-0">{ev.event}</p>
        </div>
      ))}
    </div>
  )
}
