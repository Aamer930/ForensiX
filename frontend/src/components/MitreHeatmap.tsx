interface Props {
  tactics: string[]
  timeline: { time: string; event: string; mitre_tactic?: string; mitre_technique?: string }[]
}

const ALL_TACTICS = [
  { id: 'TA0043', name: 'Reconnaissance',       short: 'RECON',    aliases: ['reconnaissance', 'recon'] },
  { id: 'TA0042', name: 'Resource Development', short: 'RES DEV',  aliases: ['resource development', 'resource_development', 'resource dev'] },
  { id: 'TA0001', name: 'Initial Access',        short: 'INIT ACC', aliases: ['initial access', 'initial_access', 'initial'] },
  { id: 'TA0002', name: 'Execution',             short: 'EXEC',     aliases: ['execution', 'execute'] },
  { id: 'TA0003', name: 'Persistence',           short: 'PERSIST',  aliases: ['persistence', 'persist'] },
  { id: 'TA0004', name: 'Privilege Escalation',  short: 'PRIV ESC', aliases: ['privilege escalation', 'privilege_escalation', 'priv esc', 'privesc', 'priv escalation'] },
  { id: 'TA0005', name: 'Defense Evasion',       short: 'DEF EVAS', aliases: ['defense evasion', 'defense_evasion', 'defence evasion', 'def evasion', 'evasion'] },
  { id: 'TA0006', name: 'Credential Access',     short: 'CRED ACC', aliases: ['credential access', 'credential_access', 'cred access', 'credentials', 'credential theft'] },
  { id: 'TA0007', name: 'Discovery',             short: 'DISCOV',   aliases: ['discovery', 'discover'] },
  { id: 'TA0008', name: 'Lateral Movement',      short: 'LAT MOV',  aliases: ['lateral movement', 'lateral_movement', 'lateral move', 'lat movement', 'lateral'] },
  { id: 'TA0009', name: 'Collection',            short: 'COLLECT',  aliases: ['collection', 'collect'] },
  { id: 'TA0011', name: 'Command and Control',   short: 'C2',       aliases: ['command and control', 'command_and_control', 'command & control', 'c2', 'c&c', 'cnc'] },
  { id: 'TA0010', name: 'Exfiltration',          short: 'EXFIL',    aliases: ['exfiltration', 'exfil', 'exfiltrate'] },
  { id: 'TA0040', name: 'Impact',                short: 'IMPACT',   aliases: ['impact', 'destruction', 'ransomware'] },
]

// Common technique → tactic fallback for when LLM omits mitre_tactic
const TECHNIQUE_TACTIC: Record<string, string> = {
  T1595: 'Reconnaissance',      T1592: 'Reconnaissance',      T1589: 'Reconnaissance',
  T1588: 'Resource Development',T1587: 'Resource Development', T1585: 'Resource Development',
  T1190: 'Initial Access',      T1566: 'Initial Access',       T1133: 'Initial Access',      T1078: 'Initial Access',
  T1059: 'Execution',           T1204: 'Execution',            T1106: 'Execution',            T1053: 'Execution',
  T1547: 'Persistence',         T1543: 'Persistence',          T1546: 'Persistence',          T1505: 'Persistence',
  T1548: 'Privilege Escalation',T1134: 'Privilege Escalation', T1068: 'Privilege Escalation',
  T1027: 'Defense Evasion',     T1070: 'Defense Evasion',      T1055: 'Defense Evasion',      T1036: 'Defense Evasion',
  T1003: 'Credential Access',   T1110: 'Credential Access',    T1555: 'Credential Access',    T1056: 'Credential Access',
  T1082: 'Discovery',           T1083: 'Discovery',            T1033: 'Discovery',            T1018: 'Discovery',
  T1021: 'Lateral Movement',    T1047: 'Lateral Movement',     T1550: 'Lateral Movement',
  T1005: 'Collection',          T1119: 'Collection',           T1560: 'Collection',           T1074: 'Collection',
  T1071: 'Command and Control', T1095: 'Command and Control',  T1573: 'Command and Control',  T1105: 'Command and Control',
  T1041: 'Exfiltration',        T1048: 'Exfiltration',         T1567: 'Exfiltration',
  T1485: 'Impact',              T1486: 'Impact',               T1489: 'Impact',               T1490: 'Impact',
}

function isTacticId(v: string): boolean {
  return /^TA\d{4}$/i.test(v.trim())
}

function matchesTactic(tactic: typeof ALL_TACTICS[0], value: string): boolean {
  const v = value.toLowerCase().trim()
  if (!v) return false
  if (tactic.name.toLowerCase() === v) return true
  if (tactic.id.toLowerCase() === v) return true
  if (tactic.short.toLowerCase() === v) return true
  return tactic.aliases.some(a => a === v || v.includes(a) || (v.length >= 6 && a.includes(v)))
}

function techniqueToTactic(tech: string): string | undefined {
  const base = tech.trim().split('.')[0].toUpperCase()
  return TECHNIQUE_TACTIC[base]
}

export default function MitreHeatmap({ tactics, timeline }: Props) {
  // Collect all mitre-related values, using technique→tactic fallback when tactic is missing
  const allMitreValues: string[] = [...(tactics ?? [])]

  for (const ev of timeline) {
    if (ev.mitre_tactic) {
      allMitreValues.push(ev.mitre_tactic)
    } else if (ev.mitre_technique) {
      // LLM sometimes fills technique but not tactic — map it
      const inferred = techniqueToTactic(ev.mitre_technique)
      if (inferred) allMitreValues.push(inferred)
    }
    if (ev.mitre_technique) allMitreValues.push(ev.mitre_technique)
  }

  const tacticData = ALL_TACTICS.map(tactic => {
    const triggered = allMitreValues.some(v => matchesTactic(tactic, v))

    const techniques: string[] = []
    for (const ev of timeline) {
      const fields = [ev.mitre_tactic, ev.mitre_technique].filter(Boolean) as string[]
      const eventMatchesTactic = fields.some(f => matchesTactic(tactic, f))
      if (eventMatchesTactic) {
        for (const f of fields) {
          if (!isTacticId(f) && !matchesTactic(tactic, f) && !techniques.includes(f)) {
            techniques.push(f)
          }
        }
      }
    }

    return { ...tactic, triggered, techniques }
  })

  const triggeredCount = tacticData.filter(t => t.triggered).length

  return (
    <div className="p-5 rounded-xl border border-gray-200 dark:border-[#1E293B] bg-gray-50 dark:bg-[#0F172A]/60">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-red-400">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-xs font-mono text-gray-500 dark:text-[#64748B] uppercase tracking-wider">MITRE ATT&CK Coverage</span>
        </div>
        <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
          triggeredCount > 0
            ? 'border-red-500/30 bg-red-500/10 text-red-400'
            : 'border-gray-200 dark:border-[#1E293B] bg-gray-100 dark:bg-[#0B1120] text-gray-400 dark:text-[#475569]'
        }`}>
          {triggeredCount} / {ALL_TACTICS.length} tactics
        </span>
      </div>

      {/* Scrollable matrix */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-1.5 min-w-[520px]">
          {tacticData.map((tactic, idx) => {
            const col = idx % 7
            // Keep tooltip inside viewport: left-align first 2 cols, right-align last 2
            const tooltipPos =
              col <= 1 ? 'left-0' :
              col >= 5 ? 'right-0' :
              'left-1/2 -translate-x-1/2'

            return (
              <div
                key={tactic.id}
                className={`relative p-2 rounded-lg border text-center transition-all duration-500 group cursor-default ${
                  tactic.triggered
                    ? 'border-red-500/40 bg-red-500/10'
                    : 'border-gray-200 dark:border-[#1E293B] bg-gray-100 dark:bg-[#0B1120]'
                }`}
                style={tactic.triggered ? { boxShadow: '0 0 12px rgba(239,68,68,0.15)' } : {}}
              >
                <p className={`text-[10px] font-mono font-bold leading-tight ${
                  tactic.triggered ? 'text-red-400' : 'text-gray-400 dark:text-[#475569]'
                }`}>
                  {tactic.short}
                </p>
                <p className={`text-[9px] font-mono mt-0.5 ${
                  tactic.triggered ? 'text-red-500/60' : 'text-gray-400 dark:text-[#1E293B]'
                }`}>
                  {tactic.id}
                </p>

                {tactic.triggered && (
                  <div className="mt-1 flex justify-center gap-0.5">
                    {tactic.techniques.length > 0
                      ? tactic.techniques.slice(0, 3).map((_, i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-red-500"
                          style={{ boxShadow: '0 0 4px rgba(239,68,68,0.5)' }} />
                      ))
                      : <span className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
                    }
                  </div>
                )}

                {tactic.triggered && (
                  <div
                    className={`absolute bottom-full ${tooltipPos} mb-2 px-3 py-2 rounded-lg border border-red-500/30 bg-white dark:bg-[#0B1120] text-left opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 w-40`}
                    style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}
                  >
                    <p className="text-[10px] font-mono text-red-400 font-bold mb-1">{tactic.name}</p>
                    {tactic.techniques.length > 0 ? (
                      tactic.techniques.map((t, i) => (
                        <p key={i} className="text-[10px] font-mono text-[#94A3B8] truncate">{t}</p>
                      ))
                    ) : (
                      <p className="text-[10px] font-mono text-gray-400 dark:text-[#475569]">Detected via analysis</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Empty state hint */}
      {triggeredCount === 0 && (
        <p className="text-center text-[10px] font-mono text-gray-400 dark:text-[#475569] mt-3">
          No MITRE tactics detected — analysis may be incomplete or sample is benign
        </p>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-[#1E293B]">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-red-500/40 bg-red-500/10" />
          <span className="text-[10px] font-mono text-gray-500 dark:text-[#64748B]">Triggered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-gray-200 dark:border-[#1E293B] bg-gray-100 dark:bg-[#0B1120]" />
          <span className="text-[10px] font-mono text-gray-500 dark:text-[#64748B]">Not Observed</span>
        </div>
      </div>
    </div>
  )
}
