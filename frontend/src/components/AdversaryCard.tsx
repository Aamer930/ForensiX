import type { AdversaryProfile } from '../lib/api'

interface Props {
  adversary: AdversaryProfile
}

export default function AdversaryCard({ adversary }: Props) {
  return (
    <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-purple-400 uppercase tracking-widest mb-1">Likely Threat Actor</p>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{adversary.name}</h3>
          <p className="text-xs text-gray-500 dark:text-[#64748B] mt-0.5">{adversary.motivation}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold font-mono text-purple-400">{adversary.confidence}%</p>
          <p className="text-[10px] text-gray-400 dark:text-[#475569] font-mono">CONFIDENCE</p>
        </div>
      </div>

      {adversary.ttps.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-400 dark:text-[#475569] font-mono uppercase tracking-wider mb-1.5">Matched TTPs</p>
          <div className="flex flex-wrap gap-1.5">
            {adversary.ttps.map(t => (
              <span key={t} className="px-2 py-0.5 rounded text-[10px] font-mono border border-purple-500/20 text-purple-300 bg-purple-500/10">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-[#475569] leading-relaxed border-t border-purple-500/10 pt-3">{adversary.notes}</p>
    </div>
  )
}
