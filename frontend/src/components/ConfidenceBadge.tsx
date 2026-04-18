interface Props { value: number }

export default function ConfidenceBadge({ value }: Props) {
  const high   = value >= 80
  const medium = value >= 60

  const color = high   ? 'border-red-500/40    text-red-400    bg-red-500/10' :
                medium ? 'border-yellow-500/40  text-yellow-400 bg-yellow-500/10' :
                         'border-blue-500/40    text-blue-400   bg-blue-500/10'

  const barColor = high   ? '#EF4444' : medium ? '#EAB308' : '#3B82F6'

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border font-mono text-xs ${color}`}>
      <span className="w-12 h-1 rounded-full bg-[#1E293B] overflow-hidden">
        <span className="block h-full rounded-full" style={{ width: `${value}%`, background: barColor }} />
      </span>
      {value}%
    </span>
  )
}
