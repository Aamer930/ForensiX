import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import TerminalStream, { StreamEvent } from '../components/TerminalStream'

const TOOL_LABELS: Record<string, string> = {
  strings: 'strings',
  yara: 'YARA',
  volatility3: 'Volatility3',
  binwalk: 'binwalk',
  vol_pslist: 'Volatility · pslist',
  vol_netscan: 'Volatility · netscan',
  vol_cmdline: 'Volatility · cmdline',
  vol_imageinfo: 'Volatility · imageinfo',
}

export default function LiveAgent() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const [events, setEvents] = useState<StreamEvent[]>([])
  const [status, setStatus] = useState<'connecting' | 'running' | 'complete' | 'error'>('connecting')
  const [activeTools, setActiveTools] = useState<Set<string>>(new Set())
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

    ws.onopen = () => {
      setStatus('running')
      retriesRef.current = 0
    }

    ws.onmessage = (msg) => {
      const ev: StreamEvent = JSON.parse(msg.data)
      setEvents(prev => [...prev, { ...ev, ts: Date.now() }])

      if (ev.type === 'step_start' && ev.tool) {
        setActiveTools(prev => new Set([...prev, ev.tool!]))
      }
      if ((ev.type === 'step_done' || ev.type === 'step_error') && ev.tool) {
        setActiveTools(prev => { const s = new Set(prev); s.delete(ev.tool!); return s })
      }
      if (ev.type === 'complete') {
        setStatus('complete')
        setTimeout(() => navigate(`/results/${jobId}`), 1200)
      }
      if (ev.type === 'error') {
        setStatus('error')
      }
    }

    ws.onclose = () => {
      if (status !== 'complete' && retriesRef.current < 5) {
        retriesRef.current++
        setTimeout(connect, Math.min(1000 * 2 ** retriesRef.current, 10000))
      }
    }
  }

  const doneCount = events.filter(e => e.type === 'step_done').length
  const totalSteps = events.filter(e => e.type === 'step_start').length

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="text-accent">Forens</span>iX Agent
          </h1>
          <p className="text-muted text-sm font-mono mt-0.5">job/{jobId?.slice(0, 8)}...</p>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Progress bar */}
      {totalSteps > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted mb-1">
            <span>Tools completed</span>
            <span>{doneCount} / {totalSteps}</span>
          </div>
          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-500 rounded-full"
              style={{ width: `${totalSteps ? (doneCount / totalSteps) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Active tool indicator */}
      {activeTools.size > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {[...activeTools].map(t => (
            <span key={t} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs">
              <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-accent" />
              {TOOL_LABELS[t] ?? t}
            </span>
          ))}
        </div>
      )}

      <TerminalStream events={events} />

      {status === 'complete' && (
        <div className="mt-4 p-4 rounded-xl bg-accent/10 border border-accent/30 text-accent text-sm flex items-center gap-2">
          <span>✓</span>
          Analysis complete — redirecting to results...
        </div>
      )}

      {status === 'error' && (
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-xl bg-surface border border-border text-sm text-white hover:border-accent/50 transition-colors"
          >
            ← Upload another file
          </button>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    connecting: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    running:    'bg-blue-500/20 text-blue-400 border-blue-500/30',
    complete:   'bg-accent/20 text-accent border-accent/30',
    error:      'bg-red-500/20 text-red-400 border-red-500/30',
  }
  const labels: Record<string, string> = {
    connecting: '⟳ Connecting',
    running:    '◆ Running',
    complete:   '✓ Complete',
    error:      '✗ Failed',
  }
  return (
    <span className={`px-3 py-1 rounded-full text-xs border font-mono ${map[status] ?? ''}`}>
      {labels[status] ?? status}
    </span>
  )
}
