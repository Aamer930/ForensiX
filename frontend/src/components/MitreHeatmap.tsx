interface Props {
  tactics: string[]  // list of triggered tactic names/IDs (may be mixed)
  timeline: { time: string; event: string; mitre_tactic?: string; mitre_technique?: string }[]
}

// Full MITRE ATT&CK Enterprise tactics in kill-chain order
const ALL_TACTICS = [
  { id: 'TA0043', name: 'Reconnaissance', short: 'RECON', aliases: ['reconnaissance', 'recon'] },
  { id: 'TA0042', name: 'Resource Development', short: 'RES DEV', aliases: ['resource development', 'resource_development'] },
  { id: 'TA0001', name: 'Initial Access', short: 'INIT ACC', aliases: ['initial access', 'initial_access'] },
  { id: 'TA0002', name: 'Execution', short: 'EXEC', aliases: ['execution'] },
  { id: 'TA0003', name: 'Persistence', short: 'PERSIST', aliases: ['persistence'] },
  { id: 'TA0004', name: 'Privilege Escalation', short: 'PRIV ESC', aliases: ['privilege escalation', 'privilege_escalation', 'priv esc'] },
  { id: 'TA0005', name: 'Defense Evasion', short: 'DEF EVAS', aliases: ['defense evasion', 'defense_evasion', 'defence evasion'] },
  { id: 'TA0006', name: 'Credential Access', short: 'CRED ACC', aliases: ['credential access', 'credential_access'] },
  { id: 'TA0007', name: 'Discovery', short: 'DISCOV', aliases: ['discovery'] },
  { id: 'TA0008', name: 'Lateral Movement', short: 'LAT MOV', aliases: ['lateral movement', 'lateral_movement'] },
  { id: 'TA0009', name: 'Collection', short: 'COLLECT', aliases: ['collection'] },
  { id: 'TA0011', name: 'Command and Control', short: 'C2', aliases: ['command and control', 'command_and_control', 'c2', 'c&c'] },
  { id: 'TA0010', name: 'Exfiltration', short: 'EXFIL', aliases: ['exfiltration'] },
  { id: 'TA0040', name: 'Impact', short: 'IMPACT', aliases: ['impact'] },
]

// Technique IDs start with T followed by digits (T1059, T1015, etc.)
// Tactic IDs start with TA followed by digits (TA0001, TA0002, etc.)
function isTacticId(v: string): boolean {
  return /^TA\d{4}$/i.test(v.trim())
}

function matchesTactic(tactic: typeof ALL_TACTICS[0], value: string): boolean {
  const v = value.toLowerCase().trim()
  if (tactic.name.toLowerCase() === v) return true
  if (tactic.id.toLowerCase() === v) return true
  if (tactic.short.toLowerCase() === v) return true
  return tactic.aliases.some(a => a === v || v.includes(a))
}

export default function MitreHeatmap({ tactics, timeline }: Props) {
  // Collect ALL mitre-related values from timeline events (both fields, since LLM may swap them)
  const allMitreValues: string[] = [...tactics]
  for (const ev of timeline) {
    if (ev.mitre_tactic) allMitreValues.push(ev.mitre_tactic)
    if (ev.mitre_technique) allMitreValues.push(ev.mitre_technique)
  }

  // Build data for each tactic
  const tacticData = ALL_TACTICS.map(tactic => {
    // Check if ANY value (from tactics list or timeline fields) matches this tactic
    const triggered = allMitreValues.some(v => matchesTactic(tactic, v))

    // Collect techniques: anything that is NOT a tactic ID from matching timeline events
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
    <div className="p-5 rounded-xl border border-[#1E293B]" style={{ background: 'rgba(15,23,42,0.6)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-red-400">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-xs font-mono text-[#64748B] uppercase tracking-wider">MITRE ATT&CK Coverage</span>
        </div>
        <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
          triggeredCount > 0
            ? 'border-red-500/30 bg-red-500/10 text-red-400'
            : 'border-[#1E293B] bg-[#0B1120] text-[#475569]'
        }`}>
          {triggeredCount} / {ALL_TACTICS.length} tactics
        </span>
      </div>

      {/* Matrix grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {tacticData.map((tactic) => (
          <div
            key={tactic.id}
            className={`relative p-2 rounded-lg border text-center transition-all duration-500 group cursor-default ${
              tactic.triggered
                ? 'border-red-500/40 bg-red-500/10'
                : 'border-[#1E293B] bg-[#0B1120]'
            }`}
            style={tactic.triggered ? { boxShadow: '0 0 12px rgba(239,68,68,0.15)' } : {}}
          >
            {/* Tactic name */}
            <p className={`text-[10px] font-mono font-bold leading-tight ${
              tactic.triggered ? 'text-red-400' : 'text-[#334155]'
            }`}>
              {tactic.short}
            </p>
            
            {/* Tactic ID */}
            <p className={`text-[9px] font-mono mt-0.5 ${
              tactic.triggered ? 'text-red-500/60' : 'text-[#1E293B]'
            }`}>
              {tactic.id}
            </p>

            {/* Hit indicator dots */}
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

            {/* Tooltip on hover */}
            {tactic.triggered && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg border border-red-500/30 bg-[#0B1120] text-left opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 min-w-[140px]"
                style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>
                <p className="text-[10px] font-mono text-red-400 font-bold mb-1">{tactic.name}</p>
                {tactic.techniques.length > 0 ? (
                  tactic.techniques.map((t, i) => (
                    <p key={i} className="text-[10px] font-mono text-[#94A3B8]">{t}</p>
                  ))
                ) : (
                  <p className="text-[10px] font-mono text-[#475569]">Detected via analysis</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#1E293B]">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-red-500/40 bg-red-500/10" />
          <span className="text-[10px] font-mono text-[#64748B]">Triggered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-[#1E293B] bg-[#0B1120]" />
          <span className="text-[10px] font-mono text-[#64748B]">Not Observed</span>
        </div>
      </div>
    </div>
  )
}
