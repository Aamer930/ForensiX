import { useTheme } from '../lib/useTheme'

interface Block { offset: number; entropy: number }

interface EntropyData {
  blocks: Block[]
  overall_entropy: number
  classification: 'benign' | 'compressed' | 'packed' | 'encrypted'
  high_entropy_regions: number
  file_size: number
  block_size: number
}

interface Props {
  toolOutputs: { tool: string; success: boolean; data: Record<string, unknown> }[]
}

const CLS_META = {
  benign:     { label: 'Benign',     color: '#22c55e', border: 'border-green-500/30',  bg: 'bg-green-500/10',  text: 'text-green-400'  },
  compressed: { label: 'Compressed', color: '#eab308', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  packed:     { label: 'Packed',     color: '#f97316', border: 'border-orange-500/30', bg: 'bg-orange-500/10', text: 'text-orange-400' },
  encrypted:  { label: 'Encrypted',  color: '#ef4444', border: 'border-red-500/30',    bg: 'bg-red-500/10',    text: 'text-red-400'    },
}

function barColor(e: number): string {
  if (e >= 7.2) return '#ef4444'
  if (e >= 6.5) return '#f97316'
  if (e >= 5.0) return '#eab308'
  return '#22c55e'
}

function fmtBytes(b: number): string {
  if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(1)} MB`
  if (b >= 1024)      return `${(b / 1024).toFixed(1)} KB`
  return `${b} B`
}

// Fixed SVG coordinate space
const VW = 800
const CHART_H = 90
const PAD_L = 32   // left axis
const PAD_R = 8
const PAD_T = 8
const PAD_B = 20   // bottom axis labels

export default function EntropyChart({ toolOutputs }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const out = toolOutputs.find(t => t.tool === 'entropy')
  if (!out?.success) return null

  const d = out.data as unknown as EntropyData
  const { blocks, overall_entropy, classification, high_entropy_regions, file_size, block_size } = d
  if (!blocks?.length) return null

  const meta = CLS_META[classification] ?? CLS_META.benign
  const chartW = VW - PAD_L - PAD_R
  const barW   = Math.max(1, chartW / blocks.length)

  // Y helpers (entropy 0–8 → pixel space)
  const toY = (e: number) => PAD_T + (1 - e / 8) * CHART_H

  // Reference thresholds
  const REF = [
    { e: 7.2, color: '#ef444466', label: '7.2' },
    { e: 6.5, color: '#f9731666', label: '6.5' },
    { e: 5.0, color: '#eab30866', label: '5.0' },
  ]

  return (
    <div className="p-5 rounded-xl border border-gray-200 dark:border-[#1E293B] bg-gray-50 dark:bg-[#0F172A]/60">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" style={{ color: meta.color }}>
            <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-xs font-mono text-gray-500 dark:text-[#64748B] uppercase tracking-wider">File Entropy Analysis</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400 dark:text-[#475569]">{fmtBytes(file_size)}</span>
          <span className={`text-xs font-mono px-2 py-0.5 rounded border font-bold ${meta.border} ${meta.bg} ${meta.text}`}>
            {overall_entropy.toFixed(2)} / 8.0 — {meta.label}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-[#1E293B] bg-gray-100 dark:bg-[#020617]">
        <svg
          viewBox={`0 0 ${VW} ${PAD_T + CHART_H + PAD_B}`}
          width="100%"
          preserveAspectRatio="none"
          style={{ display: 'block' }}
        >
          {/* Y-axis reference lines */}
          {REF.map(r => (
            <g key={r.e}>
              <line
                x1={PAD_L} y1={toY(r.e)}
                x2={VW - PAD_R} y2={toY(r.e)}
                stroke={r.color} strokeWidth={0.8} strokeDasharray="4 3"
              />
              <text x={PAD_L - 3} y={toY(r.e) + 3.5}
                fontSize={8} fontFamily="monospace" fill={isDark ? '#475569' : '#6b7280'} textAnchor="end">
                {r.label}
              </text>
            </g>
          ))}

          {/* Y-axis labels 0 and 8 */}
          <text x={PAD_L - 3} y={toY(8) + 3.5} fontSize={8} fontFamily="monospace" fill={isDark ? '#334155' : '#9ca3af'} textAnchor="end">8</text>
          <text x={PAD_L - 3} y={toY(0) + 3.5} fontSize={8} fontFamily="monospace" fill={isDark ? '#334155' : '#9ca3af'} textAnchor="end">0</text>

          {/* Bars */}
          {blocks.map((b, i) => {
            const x  = PAD_L + i * barW
            const y  = toY(b.entropy)
            const h  = CHART_H - (y - PAD_T)
            return (
              <rect
                key={i}
                x={x} y={y}
                width={Math.max(barW - 0.3, 0.7)}
                height={Math.max(h, 1)}
                fill={barColor(b.entropy)}
                opacity={0.85}
              />
            )
          })}

          {/* Overall entropy line */}
          <line
            x1={PAD_L} y1={toY(overall_entropy)}
            x2={VW - PAD_R} y2={toY(overall_entropy)}
            stroke={meta.color} strokeWidth={1.2} strokeOpacity={0.6}
          />

          {/* X-axis */}
          <line x1={PAD_L} y1={PAD_T + CHART_H} x2={VW - PAD_R} y2={PAD_T + CHART_H}
            stroke={isDark ? '#1E293B' : '#e5e7eb'} strokeWidth={0.8} />
          <text x={PAD_L} y={PAD_T + CHART_H + 13} fontSize={7.5} fontFamily="monospace" fill={isDark ? '#334155' : '#9ca3af'}>0x0</text>
          <text x={VW - PAD_R} y={PAD_T + CHART_H + 13} fontSize={7.5} fontFamily="monospace" fill={isDark ? '#334155' : '#9ca3af'} textAnchor="end">
            {`0x${file_size.toString(16).toUpperCase()}`}
          </text>
        </svg>
      </div>

      {/* Stats row — StatCard handles its own bg */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <StatCard
          label="Overall Entropy"
          value={`${overall_entropy.toFixed(3)} / 8.0`}
          sub="Shannon entropy"
          color={meta.color}
        />
        <StatCard
          label="High-Entropy Regions"
          value={`${high_entropy_regions}`}
          sub={`blocks ≥ 7.0  ·  ${fmtBytes(block_size)} each`}
          color={high_entropy_regions > 0 ? '#f97316' : '#22c55e'}
        />
        <StatCard
          label="Classification"
          value={meta.label.toUpperCase()}
          sub={CLS_HINT[classification] ?? 'Entropy analysis complete'}
          color={meta.color}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-4 pt-3 border-t border-gray-200 dark:border-[#1E293B]">
        {([
          ['#22c55e', '< 5.0  Benign / text'],
          ['#eab308', '5.0 – 6.5  Mixed'],
          ['#f97316', '6.5 – 7.2  Packed'],
          ['#ef4444', '> 7.2  Encrypted'],
        ] as const).map(([c, l]) => (
          <div key={l} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: c }} />
            <span className="text-[9px] font-mono text-gray-400 dark:text-[#475569]">{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const CLS_HINT: Record<string, string> = {
  benign:     'Low entropy — plaintext or data',
  compressed: 'Moderate entropy — likely zlib/zip',
  packed:     'High entropy — possibly UPX/custom packer',
  encrypted:  'Very high entropy — AES/RC4 or random data',
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="p-3 rounded-lg border border-gray-200 dark:border-[#1E293B] bg-gray-100 dark:bg-[#0B1120]">
      <p className="text-[9px] font-mono text-gray-400 dark:text-[#475569] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-mono font-bold" style={{ color }}>{value}</p>
      <p className="text-[9px] font-mono text-gray-400 dark:text-[#475569] mt-0.5">{sub}</p>
    </div>
  )
}
