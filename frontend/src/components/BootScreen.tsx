import { useEffect, useState } from 'react'

const BOOT_LINES = [
  { text: 'FORENSIX OS v1.0.0 — Autonomous Forensic Agent', delay: 0,    color: 'text-green-400' },
  { text: 'Copyright (c) 2025 ForensiX Systems. All rights reserved.', delay: 120,  color: 'text-[#475569]' },
  { text: '', delay: 250, color: '' },
  { text: 'Initialising hardware subsystems...', delay: 380,  color: 'text-[#64748B]' },
  { text: '  [  OK  ]  Memory controller         — 8192 MB detected', delay: 520,  color: 'text-[#475569]' },
  { text: '  [  OK  ]  Storage subsystem          — mounted', delay: 640,  color: 'text-[#475569]' },
  { text: '  [  OK  ]  Network interface          — online', delay: 760,  color: 'text-[#475569]' },
  { text: '', delay: 880, color: '' },
  { text: 'Loading forensic modules...', delay: 980,  color: 'text-[#64748B]' },
  { text: '  [  OK  ]  strings       — binary extraction engine ready', delay: 1100, color: 'text-[#475569]' },
  { text: '  [  OK  ]  yara          — 8 rule families loaded', delay: 1220, color: 'text-[#475569]' },
  { text: '  [  OK  ]  volatility3   — memory analysis engine ready', delay: 1360, color: 'text-[#475569]' },
  { text: '  [  OK  ]  binwalk       — binary inspection ready', delay: 1480, color: 'text-[#475569]' },
  { text: '', delay: 1580, color: '' },
  { text: 'Connecting to AI backend...', delay: 1680, color: 'text-[#64748B]' },
  { text: '  [  OK  ]  LLM client    — model online', delay: 1860, color: 'text-[#475569]' },
  { text: '  [  OK  ]  Agent pipeline — ready', delay: 1980, color: 'text-[#475569]' },
  { text: '', delay: 2080, color: '' },
  { text: 'All systems operational.', delay: 2200, color: 'text-green-400' },
  { text: '', delay: 2320, color: '' },
  { text: 'Launching ForensiX...', delay: 2440, color: 'text-green-300' },
]

const TOTAL_DURATION = 3200 // ms before fade out starts

interface Props {
  onDone: () => void
}

export default function BootScreen({ onDone }: Props) {
  const [visibleLines, setVisibleLines] = useState<number[]>([])
  const [fadeOut, setFadeOut] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Reveal lines one by one
    const timers: ReturnType<typeof setTimeout>[] = []

    BOOT_LINES.forEach((line, i) => {
      timers.push(setTimeout(() => {
        setVisibleLines(prev => [...prev, i])
      }, line.delay))
    })

    // Progress bar
    const start = Date.now()
    const pInterval = setInterval(() => {
      const elapsed = Date.now() - start
      setProgress(Math.min((elapsed / TOTAL_DURATION) * 100, 100))
    }, 30)

    // Fade out
    timers.push(setTimeout(() => setFadeOut(true), TOTAL_DURATION))
    timers.push(setTimeout(() => onDone(), TOTAL_DURATION + 600))

    return () => {
      timers.forEach(clearTimeout)
      clearInterval(pInterval)
    }
  }, [onDone])

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col scanlines transition-opacity duration-700 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: '#020617' }}
    >
      {/* Scan sweep */}
      <div className="scan-sweep" />

      {/* Grid bg */}
      <div className="absolute inset-0 grid-bg opacity-50" />

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-green-500/40" />
      <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-green-500/40" />
      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-green-500/40" />
      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-green-500/40" />

      {/* Main content */}
      <div className="relative z-10 flex flex-col flex-1 p-8 max-w-3xl mx-auto w-full justify-center">

        {/* Logo */}
        <div className="mb-8">
          <div className="text-4xl font-bold font-mono mb-1">
            <span className="neon-text">Forens</span><span className="text-white">iX</span>
          </div>
          <div className="h-px w-full bg-gradient-to-r from-green-500/60 via-green-500/20 to-transparent" />
        </div>

        {/* Boot lines */}
        <div className="font-mono text-xs space-y-0.5 flex-1">
          {BOOT_LINES.map((line, i) => (
            <div
              key={i}
              className={`transition-all duration-150 ${
                visibleLines.includes(i) ? 'opacity-100' : 'opacity-0'
              } ${line.color}`}
              style={{ minHeight: line.text ? '1.2rem' : '0.6rem' }}
            >
              {line.text}
            </div>
          ))}

          {/* Blinking cursor at end */}
          {visibleLines.length >= BOOT_LINES.length && (
            <div className="text-green-400 font-mono text-xs mt-1">
              <span className="cursor-blink">█</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative z-10 px-8 pb-6">
        <div className="flex items-center justify-between text-xs font-mono text-[#334155] mb-2">
          <span>BOOT SEQUENCE</span>
          <span className="text-green-500">{Math.round(progress)}%</span>
        </div>
        <div className="h-0.5 w-full bg-[#0F172A] rounded-full overflow-hidden border border-[#1E293B]">
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #15803D, #22C55E)',
              boxShadow: '0 0 8px rgba(34,197,94,0.6)',
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] font-mono text-[#1E293B]">
          <span>FORENSIX AUTONOMOUS FORENSIC AGENT</span>
          <span>UNIVERSITY PROJECT 2025</span>
        </div>
      </div>
    </div>
  )
}
