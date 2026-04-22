import { useState, useCallback, DragEvent, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadFile, uploadSample, getAiMode, setAiMode, getSamples, SampleInfo } from '../lib/api'
import { usePageTitle } from '../lib/usePageTitle'
import { useToast } from '../components/Toast'

const FEATURES = [
  { label: 'Memory Dumps' },
  { label: 'PE Executables' },
  { label: 'Log Files' },
  { label: 'Disk Images' },
]

const STATS = [
  { value: 4,   suffix: '',  label: 'Forensic Tools' },
  { value: 2,   suffix: '',  label: 'AI Calls / Run' },
  { value: 8,   suffix: '+', label: 'YARA Rule Families' },
  { value: 100, suffix: '%', label: 'Autonomous' },
]

function AnimatedCounter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef(false)

  useEffect(() => {
    if (ref.current) return
    ref.current = true
    const duration = 1200
    const steps = 40
    const increment = target / steps
    let current = 0
    const t = setInterval(() => {
      current = Math.min(current + increment, target)
      setCount(Math.round(current))
      if (current >= target) clearInterval(t)
    }, duration / steps)
    return () => clearInterval(t)
  }, [target])

  return <span>{count}{suffix}</span>
}

export default function Upload() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [aiMode, setAiModeState] = useState<'claude' | 'ollama'>('claude')
  const [modeLoading, setModeLoading] = useState(false)
  usePageTitle('Upload')

  useEffect(() => {
    getAiMode().then(r => setAiModeState(r.mode as 'claude' | 'ollama')).catch(() => {})
  }, [])

  const toggleMode = async () => {
    const next = aiMode === 'claude' ? 'ollama' : 'claude'
    setModeLoading(true)
    try {
      await setAiMode(next)
      setAiModeState(next)
      toast(`Switched to ${next === 'claude' ? 'Claude API' : 'Ollama (local)'}`, 'success')
    } catch {
      toast('Failed to switch AI mode', 'error')
    } finally {
      setModeLoading(false)
    }
  }

  const tagline = 'Autonomous Forensic Agent'
  useEffect(() => {
    let i = 0
    const t = setInterval(() => {
      setTyped(tagline.slice(0, i + 1))
      i++
      if (i >= tagline.length) clearInterval(t)
    }, 50)
    return () => clearInterval(t)
  }, [])

  const handleFile = useCallback(async (file: File) => {
    setLoading(true)
    setError(null)
    try {
      toast(`Uploading ${file.name}...`, 'info')
      const res = await uploadFile(file)
      toast('Analysis started', 'success')
      navigate(`/live/${res.job_id}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Upload failed'
      setError(msg)
      toast(msg, 'error')
      setLoading(false)
    }
  }, [navigate, toast])

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const [samples, setSamples] = useState<SampleInfo[]>([])
  const [showSamples, setShowSamples] = useState(false)

  useEffect(() => {
    getSamples().then(r => setSamples(r.samples)).catch(() => {})
  }, [])

  const onLoadSample = async (name: string = 'cridex.vmem') => {
    setLoading(true)
    setError(null)
    setShowSamples(false)
    try {
      toast(`Loading ${name}...`, 'info')
      const res = await uploadSample(name)
      toast('Sample loaded — starting analysis', 'success')
      navigate(`/live/${res.job_id}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load sample'
      setError(msg)
      toast(msg, 'error')
      setLoading(false)
    }
  }

  return (
    <div className="scanlines min-h-screen grid-bg flex flex-col items-center justify-center px-4 relative overflow-hidden">

      {/* Radial glow behind logo */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)' }} />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 border-b border-[#1E293B]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 pulse-glow" />
          <span className="text-xs font-mono text-[#64748B]">FORENSIX v1.0</span>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-[#64748B]">
          <span>SYS:READY</span>
          <span className="neon-text">●</span>
          <button
            onClick={toggleMode}
            disabled={modeLoading}
            title="Switch AI backend"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#1E293B] hover:border-green-500/50 hover:bg-green-500/5 transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            {aiMode === 'claude' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-green-400">CLAUDE API</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span className="text-purple-400">OLLAMA LOCAL</span>
              </>
            )}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={`w-3 h-3 ml-0.5 text-[#475569] ${modeLoading ? 'animate-spin' : ''}`}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
          <button
            onClick={() => navigate('/history')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#1E293B] hover:border-green-500/50 hover:bg-green-500/5 transition-all duration-200 cursor-pointer"
          >
            <span className="text-white">CASE HISTORY</span>
          </button>
        </div>
      </div>

      {/* Logo */}
      <div className="mb-10 text-center fade-in-up">
        <h1
          className="text-7xl font-bold tracking-tight font-mono glitch cursor-default select-none"
          data-text="ForensiX"
        >
          <span className="neon-text">Forens</span><span className="text-white">iX</span>
        </h1>
        <p className="mt-3 text-sm font-mono text-[#64748B] h-5">
          {typed}<span className="cursor-blink">_</span>
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !loading && document.getElementById('file-input')?.click()}
        className={`
          relative w-full max-w-lg border rounded-xl p-10 text-center cursor-pointer
          transition-all duration-300 fade-in-up-1 overflow-hidden
          ${dragging
            ? 'border-green-500 bg-green-500/5 neon-border'
            : 'border-[#1E293B] hover:border-green-500/40 hover:bg-green-500/5'
          }
        `}
        style={{ background: 'rgba(15,23,42,0.8)' }}
      >
        {/* Scan sweep */}
        {dragging && <div className="scan-sweep" />}

        <input
          id="file-input"
          type="file"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />

        {/* Upload icon */}
        <div className={`mb-4 mx-auto w-16 h-16 flex items-center justify-center transition-all duration-300 ${dragging ? 'float' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
            className={`w-12 h-12 transition-colors duration-300 ${dragging ? 'text-green-500' : 'text-[#334155]'}`}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>

        <p className="text-white font-medium mb-1 font-mono">
          {dragging ? 'Release to analyse' : 'Drop forensic artefact here'}
        </p>
        <p className="text-[#64748B] text-sm">or click to browse</p>

        {/* Supported types */}
        <div className="flex flex-wrap justify-center gap-2 mt-5">
          {FEATURES.map((f) => (
            <span key={f.label}
              className="px-3 py-1 rounded-full border border-[#1E293B] text-xs font-mono text-[#64748B] bg-[#0F172A]">
              {f.label}
            </span>
          ))}
        </div>
        <p className="text-[#334155] text-xs mt-3 font-mono">MAX 500MB</p>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 mt-5 w-full max-w-lg fade-in-up-2">
        <div className="flex-1 h-px bg-[#1E293B]" />
        <span className="text-[#334155] text-xs font-mono">OR</span>
        <div className="flex-1 h-px bg-[#1E293B]" />
      </div>

      {/* Load sample button + picker */}
      <div className="mt-5 w-full max-w-lg fade-in-up-3 relative" style={{ zIndex: 50 }}>
        {/* Backdrop to close dropdown */}
        {showSamples && (
          <div className="fixed inset-0 z-40" onClick={() => setShowSamples(false)} />
        )}

        {/* Sample picker dropdown — opens UPWARD */}
        {showSamples && !loading && (
          <div className="absolute left-0 right-0 bottom-full mb-2 rounded-xl border border-[#1E293B] overflow-hidden z-50 max-h-[320px] overflow-y-auto"
            style={{ background: '#0B1120', boxShadow: '0 -8px 32px rgba(34,197,94,0.08), 0 0 0 1px rgba(30,41,59,0.5)' }}>
            {samples.map((s) => {
              const typeColors: Record<string, string> = {
                memory_dump: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
                pe_executable: 'text-red-400 border-red-500/30 bg-red-500/10',
                log_file: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
                disk_image: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
              }
              const color = typeColors[s.file_type] || 'text-gray-400 border-gray-500/30 bg-gray-500/10'
              const sizeStr = s.size > 1024 * 1024
                ? `${(s.size / (1024 * 1024)).toFixed(1)} MB`
                : `${(s.size / 1024).toFixed(1)} KB`

              return (
                <button
                  key={s.filename}
                  onClick={() => onLoadSample(s.filename)}
                  className="w-full px-4 py-3 text-left hover:bg-green-500/5 border-b border-[#1E293B] last:border-b-0 transition-colors duration-150 cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-white group-hover:text-green-400 transition-colors">
                      {s.filename}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-mono border ${color}`}>
                        {s.file_type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-[#475569] font-mono">{sizeStr}</span>
                    </div>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1">{s.description}</p>
                </button>
              )
            })}
          </div>
        )}

        <button
          onClick={() => setShowSamples(!showSamples)}
          disabled={loading}
          className="w-full px-6 py-2.5 rounded-lg font-mono text-sm btn-neon disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500/50 relative z-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Analysing...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              Load Demo Sample
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className={`w-4 h-4 transition-transform duration-200 ${showSamples ? 'rotate-180' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </span>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 px-4 py-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-mono max-w-lg w-full fade-in-up">
          <span className="mr-2">✗</span>{error}
        </div>
      )}

      {/* Animated stats */}
      <div className="grid grid-cols-4 gap-4 mt-8 w-full max-w-lg fade-in-up-4">
        {STATS.map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-xl font-bold font-mono neon-text">
              <AnimatedCounter target={s.value} suffix={s.suffix} />
            </p>
            <p className="text-[#334155] text-xs font-mono mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p className="absolute bottom-4 text-[#1E293B] text-xs font-mono">
        UNIVERSITY PROJECT — FORENSIX AUTONOMOUS FORENSIC AGENT
      </p>
    </div>
  )
}
