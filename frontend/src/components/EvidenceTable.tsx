import ConfidenceBadge from './ConfidenceBadge'

interface Evidence { finding: string; source: string; confidence: number }
interface Props     { evidence: Evidence[] }

export default function EvidenceTable({ evidence }: Props) {
  if (!evidence.length) return (
    <p className="text-[#334155] text-sm font-mono">// No evidence items recorded.</p>
  )

  return (
    <div className="rounded-xl border border-[#1E293B] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1E293B]" style={{ background: 'rgba(15,23,42,0.8)' }}>
            <th className="text-left px-4 py-3 text-[#334155] font-mono text-xs uppercase tracking-widest">Finding</th>
            <th className="text-left px-4 py-3 text-[#334155] font-mono text-xs uppercase tracking-widest w-36">Source</th>
            <th className="text-left px-4 py-3 text-[#334155] font-mono text-xs uppercase tracking-widest w-32">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {evidence.map((ev, i) => (
            <tr
              key={i}
              className="border-b border-[#0F172A] transition-colors duration-200"
              style={{ background: i % 2 === 0 ? 'rgba(15,23,42,0.4)' : 'rgba(2,6,23,0.4)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'rgba(15,23,42,0.4)' : 'rgba(2,6,23,0.4)')}
            >
              <td className="px-4 py-3 text-[#CBD5E1] leading-relaxed">{ev.finding}</td>
              <td className="px-4 py-3 font-mono text-xs text-purple-400">{ev.source}</td>
              <td className="px-4 py-3"><ConfidenceBadge value={ev.confidence} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
