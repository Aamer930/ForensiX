import { useEffect, useState, useRef } from 'react'

interface Props {
  score: number  // 0-100
}

export default function ThreatRiskScore({ score }: Props) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const ref = useRef(false)

  useEffect(() => {
    if (ref.current) return
    ref.current = true
    const duration = 1800
    const steps = 60
    const inc = score / steps
    let current = 0
    const t = setInterval(() => {
      current = Math.min(current + inc, score)
      setAnimatedScore(Math.round(current))
      if (current >= score) clearInterval(t)
    }, duration / steps)
    return () => clearInterval(t)
  }, [score])

  const radius = 70
  const stroke = 8
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (animatedScore / 100) * circumference

  const getColor = (s: number) => {
    if (s >= 75) return { main: '#EF4444', glow: 'rgba(239,68,68,0.3)', label: 'CRITICAL', bg: 'rgba(239,68,68,0.08)' }
    if (s >= 50) return { main: '#F97316', glow: 'rgba(249,115,22,0.3)', label: 'HIGH', bg: 'rgba(249,115,22,0.08)' }
    if (s >= 25) return { main: '#EAB308', glow: 'rgba(234,179,8,0.3)', label: 'MEDIUM', bg: 'rgba(234,179,8,0.08)' }
    return { main: '#22C55E', glow: 'rgba(34,197,94,0.3)', label: 'LOW', bg: 'rgba(34,197,94,0.08)' }
  }

  const color = getColor(animatedScore)

  return (
    <div className="flex flex-col items-center justify-center p-6 rounded-xl border border-gray-200 dark:border-[#1E293B] bg-gray-50 dark:bg-[#0F172A]/80">
      <div className="relative" style={{ width: 180, height: 180 }}>
        {/* Background glow */}
        <div className="absolute inset-0 rounded-full"
          style={{ background: `radial-gradient(circle, ${color.bg} 0%, transparent 70%)` }} />

        <svg width="180" height="180" className="transform -rotate-90">
          {/* Track */}
          <circle cx="90" cy="90" r={radius} fill="none"
            stroke="currentColor" strokeWidth={stroke} className="text-gray-300 dark:text-[#1E293B]" />
          {/* Progress */}
          <circle cx="90" cy="90" r={radius} fill="none"
            stroke={color.main}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              transition: 'stroke-dashoffset 0.1s ease-out',
              filter: `drop-shadow(0 0 6px ${color.glow})`,
            }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold font-mono" style={{ color: color.main }}>
            {animatedScore}
          </span>
          <span className="text-xs font-mono text-gray-400 dark:text-[#64748B] mt-1">/ 100</span>
        </div>
      </div>

      {/* Label */}
      <div className="mt-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: color.main, boxShadow: `0 0 8px ${color.glow}` }} />
        <span className="text-sm font-mono font-bold" style={{ color: color.main }}>
          {color.label} RISK
        </span>
      </div>
      <p className="text-xs text-gray-400 dark:text-[#475569] font-mono mt-1">Threat Assessment Score</p>
    </div>
  )
}
