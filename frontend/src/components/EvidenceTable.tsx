import ConfidenceBadge from './ConfidenceBadge'
import { useTheme } from '../lib/useTheme'

interface Evidence { finding: string; source: string; confidence: number }
interface Props     { evidence: Evidence[] }

export default function EvidenceTable({ evidence }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const rowBg = (i: number) =>
    isDark
      ? (i % 2 === 0 ? 'rgba(15,23,42,0.4)' : 'rgba(2,6,23,0.4)')
      : (i % 2 === 0 ? 'rgba(248,250,252,0.8)' : 'rgba(255,255,255,0.8)')

  if (!evidence.length) return (
    <p className="text-gray-400 dark:text-[#475569] text-sm font-mono">// No evidence items recorded.</p>
  )

  return (
    <div className="rounded-xl border border-gray-200 dark:border-[#1E293B] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-[#1E293B] bg-gray-50 dark:bg-[#0F172A]/80">
            <th className="text-left px-4 py-3 text-gray-500 dark:text-[#475569] font-mono text-xs uppercase tracking-widest">Finding</th>
            <th className="text-left px-4 py-3 text-gray-500 dark:text-[#475569] font-mono text-xs uppercase tracking-widest w-36">Source</th>
            <th className="text-left px-4 py-3 text-gray-500 dark:text-[#475569] font-mono text-xs uppercase tracking-widest w-32">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {evidence.map((ev, i) => (
            <tr
              key={i}
              className="border-b border-gray-100 dark:border-[#0F172A] transition-colors duration-200"
              style={{ background: rowBg(i) }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = rowBg(i))}
            >
              <td className="px-4 py-3 text-gray-700 dark:text-[#CBD5E1] leading-relaxed">{ev.finding}</td>
              <td className="px-4 py-3 font-mono text-xs text-purple-400">{ev.source}</td>
              <td className="px-4 py-3"><ConfidenceBadge value={ev.confidence} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
