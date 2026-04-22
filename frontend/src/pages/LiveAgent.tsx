import { useEffect, useRef, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import TerminalStream, { StreamEvent } from '../components/TerminalStream'
import { usePageTitle } from '../lib/usePageTitle'
import { useToast } from '../components/Toast'

const TOOL_LABELS: Record<string, string> = {
  strings: 'strings',
  yara: 'YARA',
  volatility3: 'Volatility3',
  binwalk: 'binwalk',
  vol_pslist: 'pslist',
  vol_netscan: 'netscan',
  vol_cmdline: 'cmdline',
  vol_imageinfo: 'imageinfo',
}

const STEPS = ['strings', 'yara', 'volatility3', 'binwalk']

// Animated lines for the cyber loading effect
const LOADING_LINES = [
  'Initializing forensic agent kernel...',
  'Loading YARA signature database (8 families)...',
  'Calibrating memory analysis engine...',
  'Connecting to Volatility3 framework...',
  'Priming string extraction heuristics...',
  'Mounting binary analysis subsystem...',
  'Agent ready — beginning autonomous analysis...',
]

export default function LiveAgent() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const [events, setEvents] = useState<StreamEvent[]>([])
  const [status, setStatus] = useState<'connecting' | 'running' | 'complete' | 'error'>('connecting')
  const [activeTools, setActiveTools] = useState<Set<string>>(new Set())
  const [doneTools, setDoneTools] = useState<Set<string>>(new Set())
  const [loadingLine, setLoadingLine] = useState(0)
  const [showScanner, setShowScanner] = useState(true)
  const [tick, setTick] = useState(0)
  const helixPhases = useMemo(() => Array.from({ length: 20 }, (_, i) => i * 0.8), [])
  const wsRef = useRef<WebSocket | null>(null)
  const retriesRef = useRef(0)
  const { toast } = useToast()
  usePageTitle('Live Agent')

  // Animated loading text
  useEffect(() => {
    if (status !== 'connecting' && status !== 'running') return
    const t = setInterval(() => {
      setLoadingLine(prev => (prev + 1) % LOADING_LINES.length)
    }, 2000)
    return () => clearInterval(t)
  }, [status])

  // Helix animation tick
  useEffect(() => {
    if (!showScanner) return
    const t = setInterval(() => setTick(prev => prev + 1), 60)
    return () => clearInterval(t)
  }, [showScanner])

  // Hide scanner once first tool starts
  useEffect(() => {
    if (events.some(e => e.type === 'step_start')) {
      setShowScanner(false)
    }
  }, [events])

  useEffect(() => {
    if (!jobId) return
    connect()
    return () => wsRef.current?.close()
  }, [jobId])

  function connect() {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${window.location.host}/ws/${jobId}`)
    wsRef.current = ws

    ws.onopen = () => { setStatus('running'); retriesRef.current = 0 }

    ws.onmessage = (msg) => {
      const ev: StreamEvent = JSON.parse(msg.data)
      setEvents(prev => [...prev, { ...ev, ts: Date.now() }])

      if (ev.type === 'step_start' && ev.tool) {
        setActiveTools(prev => new Set([...prev, ev.tool!]))
      }
      if ((ev.type === 'step_done' || ev.type === 'step_error') && ev.tool) {
        const base = ev.tool.replace(/^vol_.*$/, 'volatility3')
        setDoneTools(prev => new Set([...prev, base]))
        setActiveTools(prev => { const s = new Set(prev); s.delete(ev.tool!); return s })
      }
      if (ev.type === 'complete') {
        setStatus('complete')
        toast('Analysis complete — loading results', 'success')
        setTimeout(() => navigate(`/results/${jobId}`), 1500)
      }
      if (ev.type === 'error') {
        setStatus('error')
        toast(ev.message, 'error')
      }
    }

    ws.onclose = () => {
      if (status !== 'complete' && retriesRef.current < 5) {
        retriesRef.current++
        setTimeout(connect, Math.min(1000 * 2 ** retriesRef.current, 10000))
      }
    }
  }

  const totalTools = events.filter(e => e.type === 'step_start').length
  const doneCount  = events.filter(e => e.type === 'step_done' || e.type === 'step_error').length
  const progress   = totalTools > 0 ? Math.round((doneCount / totalTools) * 100) : 0

  return (
    <div className="scanlines min-h-screen grid-bg px-4 py-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 fade-in-up">
        <div>
          <h1 className="text-2xl font-bold font-mono">
            <span className="neon-text">Forens</span><span className="text-white">iX</span>
            <span className="text-[#334155] ml-3 text-base font-normal">Agent</span>
          </h1>
          <p className="text-xs font-mono text-[#334155] mt-0.5">
            JOB/<span className="text-[#475569]">{jobId?.slice(0, 12)}...</span>
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Animated scanner effect during initialization */}
      {showScanner && (
        <div className="mb-5 p-6 rounded-xl border border-[#1E293B] bg-[#0F172A] fade-in-up overflow-hidden relative">
          {/* Scanning line animation */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-green-500 to-transparent animate-scan-line" />
          </div>
          
          {/* DNA helix visualization */}
          <div className="flex items-center justify-center mb-4">
            <div className="flex gap-1 items-end" style={{ height: 36 }}>
              {helixPhases.map((phase, i) => {
                const h = 10 + Math.sin(phase + tick * 0.18) * 10
                const op = 0.35 + (Math.sin(phase + tick * 0.18) + 1) * 0.3
                return (
                  <div
                    key={i}
                    className="w-1.5 rounded-full bg-green-500"
                    style={{ height: `${Math.max(4, h)}px`, opacity: op }}
                  />
                )
              })}
            </div>
          </div>

          {/* Loading text */}
          <p className="text-center text-sm font-mono text-green-400 transition-all duration-500">
            <span className="text-[#334155] mr-2">$</span>
            {LOADING_LINES[loadingLine]}
            <span className="cursor-blink ml-0.5">_</span>
          </p>
          <p className="text-center text-xs font-mono text-[#334155] mt-2">
            ForensiX Autonomous Agent v1.0 — Preparing analysis environment
          </p>
        </div>
      )}

      {/* Tool pipeline tracker */}
      <div className="mb-5 p-4 rounded-xl border border-[#1E293B] bg-[#0F172A] fade-in-up-1">
        <p className="text-xs font-mono text-[#334155] mb-3">PIPELINE</p>
        <div className="flex items-center gap-2">
          {STEPS.map((step, i) => {
            const done    = doneTools.has(step)
            const active  = [...activeTools].some(t => t === step || t.startsWith('vol_') && step === 'volatility3')
            return (
              <div key={step} className="flex items-center gap-2 flex-1">
                <div className={`flex-1 py-2 px-3 rounded-lg border text-center text-xs font-mono transition-colors duration-300 ${
                  done    ? 'border-green-500/40 bg-green-500/10 text-green-400'  :
                  active  ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400 pulse-glow' :
                            'border-[#1E293B] text-[#334155]'
                }`}>
                  {done ? '✓ ' : active ? '► ' : `${i + 1}. `}
                  {TOOL_LABELS[step] ?? step}
                </div>
                {i < STEPS.length - 1 && (
                  <svg className={`w-3 h-3 shrink-0 ${done ? 'text-green-500' : 'text-[#1E293B]'}`}
                    viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Progress bar */}
      {totalTools > 0 && (
        <div className="mb-4 fade-in-up-1">
          <div className="flex justify-between text-xs font-mono text-[#334155] mb-1.5">
            <span>PROGRESS</span>
            <span className="text-green-500">{progress}%</span>
          </div>
          <div className="h-1.5 bg-[#0F172A] rounded-full overflow-hidden border border-[#1E293B]">
            <div
              className="h-full rounded-full transition-all duration-700 relative"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #15803D, #22C55E)',
                boxShadow: '0 0 8px rgba(34,197,94,0.5)',
              }}
            >
              {/* Shimmer effect on progress bar */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="w-full h-full animate-shimmer"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                    backgroundSize: '200% 100%',
                  }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terminal */}
      <div className="fade-in-up-2">
        <TerminalStream events={events} />
      </div>

      {/* Complete */}
      {status === 'complete' && (
        <div className="mt-4 px-4 py-3 rounded-lg border border-green-500/30 bg-green-500/10 font-mono text-sm text-green-400 flex items-center gap-3 fade-in-up">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Analysis complete — redirecting to results...
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="mt-4 flex gap-3 fade-in-up">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-lg border border-[#1E293B] font-mono text-sm text-white hover:border-green-500/40 transition-colors cursor-pointer"
          >
            ← Upload another file
          </button>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    connecting: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10',
    running:    'border-cyan-500/30   text-cyan-400   bg-cyan-500/10',
    complete:   'border-green-500/30  text-green-400  bg-green-500/10',
    error:      'border-red-500/30    text-red-400    bg-red-500/10',
  }
  const labels: Record<string, string> = {
    connecting: '◌ CONNECTING',
    running:    '◆ ANALYSING',
    complete:   '✓ COMPLETE',
    error:      '✗ FAILED',
  }
  return (
    <span className={`px-3 py-1 rounded-lg text-xs border font-mono ${styles[status] ?? ''}`}>
      {labels[status] ?? status}
    </span>
  )
}
