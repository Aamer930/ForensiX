import ConfidenceBadge from './ConfidenceBadge'

interface Evidence {
  finding: string
  source: string
  confidence: number
}

interface Props {
  evidence: Evidence[]
}

export default function EvidenceTable({ evidence }: Props) {
  if (!evidence.length) {
    return <p className="text-muted text-sm">No evidence items recorded.</p>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface border-b border-border">
            <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wider">Finding</th>
            <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wider w-32">Source</th>
            <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wider w-28">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {evidence.map((ev, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-surface/50 transition-colors">
              <td className="px-4 py-3 text-white leading-relaxed">{ev.finding}</td>
              <td className="px-4 py-3 font-mono text-purple-400 text-xs">{ev.source}</td>
              <td className="px-4 py-3">
                <ConfidenceBadge value={ev.confidence} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
