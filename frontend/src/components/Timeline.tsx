interface Event {
  time: string
  event: string
}

interface Props {
  events: Event[]
}

export default function Timeline({ events }: Props) {
  if (!events.length) {
    return <p className="text-muted text-sm">No timeline events recorded.</p>
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
      {events.map((ev, i) => (
        <div key={i} className="relative mb-5">
          <div className="absolute -left-4 top-1.5 w-2.5 h-2.5 rounded-full bg-accent border-2 border-dark" />
          <p className="text-xs text-muted font-mono mb-0.5">{ev.time}</p>
          <p className="text-sm text-white leading-relaxed">{ev.event}</p>
        </div>
      ))}
    </div>
  )
}
