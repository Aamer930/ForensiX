import type { Hypothesis } from '../lib/api'

interface Props {
  primary: string
  hypotheses: Hypothesis[]
}

const RANK_COLORS = [
  { bar: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/5' },
  { bar: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500/20', bg: 'bg-yellow-500/5' },
  { bar: 'bg-[#475569]', text: 'text-gray-500 dark:text-[#64748B]', border: 'border-gray-200 dark:border-[#1E293B]', bg: 'bg-gray-50 dark:bg-[#0F172A]' },
]

export default function HypothesisPanel({ primary, hypotheses }: Props) {
  if (!hypotheses.length) {
    return (
      <div className="p-4 rounded-lg border border-gray-200 dark:border-[#1E293B] bg-gray-50 dark:bg-[#0F172A]">
        <p className="text-sm text-gray-600 dark:text-[#94A3B8] leading-relaxed">{primary}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {hypotheses.map((h, i) => {
        const c = RANK_COLORS[i] ?? RANK_COLORS[2]
        return (
          <div key={i} className={`p-4 rounded-lg border ${c.border} ${c.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono font-bold ${c.text}`}>#{i + 1}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{h.label}</span>
              </div>
              <span className={`text-xs font-mono ${c.text}`}>{h.confidence}%</span>
            </div>
            <div className="h-1 bg-gray-100 dark:bg-[#0F172A] rounded-full mb-3 overflow-hidden border border-gray-200 dark:border-[#1E293B]">
              <div
                className={`h-full rounded-full transition-all duration-700 ${c.bar}`}
                style={{ width: `${h.confidence}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-[#64748B] leading-relaxed">{h.description}</p>
          </div>
        )
      })}
    </div>
  )
}
