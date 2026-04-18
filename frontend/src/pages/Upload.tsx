import { useState, useCallback, DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadFile, uploadSample } from '../lib/api'

export default function Upload() {
  const navigate = useNavigate()
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(async (file: File) => {
    setLoading(true)
    setError(null)
    try {
      const res = await uploadFile(file)
      navigate(`/live/${res.job_id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
      setLoading(false)
    }
  }, [navigate])

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const onLoadSample = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await uploadSample()
      navigate(`/live/${res.job_id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load sample')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-10 text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          <span className="text-accent">Forens</span><span className="text-white">iX</span>
        </h1>
        <p className="text-muted mt-2 text-sm">Autonomous Forensic Agent — Powered by Claude AI</p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById('file-input')?.click()}
        className={`
          w-full max-w-xl border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
          transition-all duration-200
          ${dragging ? 'border-accent bg-accent/5 scale-[1.01]' : 'border-border hover:border-accent/50 hover:bg-surface/50'}
        `}
      >
        <input
          id="file-input"
          type="file"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        <div className="text-4xl mb-4">🔍</div>
        <p className="text-white font-medium mb-1">Drop forensic artifact here</p>
        <p className="text-muted text-sm">Memory dumps · Log files · PE executables · Disk images</p>
        <p className="text-muted text-xs mt-2">Max 500MB</p>
      </div>

      <div className="flex items-center gap-4 mt-5 w-full max-w-xl">
        <hr className="flex-1 border-border" />
        <span className="text-muted text-xs">or</span>
        <hr className="flex-1 border-border" />
      </div>

      <button
        onClick={onLoadSample}
        disabled={loading}
        className="mt-5 px-6 py-2.5 rounded-xl bg-surface border border-border text-sm text-white hover:border-accent/60 hover:text-accent transition-colors disabled:opacity-50"
      >
        Load Demo Sample <span className="text-muted text-xs ml-1">(cridex.vmem)</span>
      </button>

      {loading && (
        <div className="mt-6 flex items-center gap-3 text-accent text-sm">
          <span className="animate-spin text-lg">⟳</span>
          Uploading and starting analysis...
        </div>
      )}

      {error && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm max-w-xl w-full">
          {error}
        </div>
      )}

      <p className="text-muted text-xs mt-10">
        University Project — ForensiX v1.0
      </p>
    </div>
  )
}
