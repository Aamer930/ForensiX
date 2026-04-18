import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import TerminalStream, { StreamEvent } from '../components/TerminalStream'

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

export default function LiveAgent() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const [events, setEvents] = useState<StreamEvent[]>([])
  const [status, setStatus] = useState<'connecting' | 'running' | 'complete' | 'error'>('connecting')
  const [activeTools, setActiveTools] = useState<Set<string>>(new Set())
  const [doneTools, setDoneTools] = useState<Set<string>>(new Set())
  const wsRef = useRef<WebSocket | null>(null)
  const retriesRef = useRef(0)

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
        setTimeout(() => navigate(`/results/${jobId}`), 1500)
      }
      if (ev.type === 'error') setStatus('error')
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

      {/* Tool pipeline tracker */}
      <div className="mb-5 p-4 rounded-xl border border-[#1E293B] bg-[#0F172A] fade-in-up-1">
        <p className="text-xs font-mono text-[#334155] mb-3">PIPELINE</p>
        <div className="flex items-center gap-2">
          {STEPS.map((step, i) => {
            const done    = doneTools.has(step)
            const active  = [...activeTools].some(t => t === step || t.startsWith('vol_') && step === 'volatility3')
            const pending = !done && !active
            return (
              <div key={step} className="flex items-center gap-2 flex-1">
                <div className={`flex-1 py-2 px-3 rounded-lg border text-center text-xs font-mono transition-all duration-500 ${
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
          <div className="h-1 bg-[#0F172A] rounded-full overflow-hidden border border-[#1E293B]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #15803D, #22C55E)',
                boxShadow: '0 0 8px rgba(34,197,94,0.5)',
              }}
            />
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
    running:    '◆ RUNNING',
    complete:   '✓ COMPLETE',
    error:      '✗ FAILED',
  }
  return (
    <span className={`px-3 py-1 rounded-lg text-xs border font-mono ${styles[status] ?? ''}`}>
      {labels[status] ?? status}
    </span>
  )
}
