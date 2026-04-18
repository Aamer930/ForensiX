interface Props {
  value: number // 0-100
}

export default function ConfidenceBadge({ value }: Props) {
  const color =
    value >= 80 ? 'bg-red-500/20 text-red-400 border-red-500/30' :
    value >= 60 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                  'bg-blue-500/20 text-blue-400 border-blue-500/30'

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono border ${color}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {value}%
    </span>
  )
}
