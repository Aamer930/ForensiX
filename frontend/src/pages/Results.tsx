import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getJob, type Job } from '../lib/api'
import Timeline from '../components/Timeline'
import EvidenceTable from '../components/EvidenceTable'

export default function Results() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const [job, setJob] = useState<Job | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!jobId) return
    getJob(jobId)
      .then(setJob)
      .catch(e => setError(e.message))
  }, [jobId])

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-red-400">{error}</p>
    </div>
  )

  if (!job) return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="animate-spin text-accent text-3xl">⟳</span>
    </div>
  )

  const c = job.correlation

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            <span className="text-accent">Analysis</span> Results
          </h1>
          <p className="text-muted text-sm mt-1 font-mono">{job.filename} · {job.file_type}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/report/${jobId}`)}
            className="px-4 py-2 rounded-xl bg-accent text-dark text-sm font-semibold hover:bg-accent/90 transition-colors"
          >
            Download PDF →
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-xl bg-surface border border-border text-sm text-white hover:border-accent/50 transition-colors"
          >
            New Analysis
          </button>
        </div>
      </div>

      {/* Attack Hypothesis */}
      <section className="mb-8 p-5 rounded-2xl bg-surface border border-border">
        <h2 className="text-xs uppercase tracking-widest text-muted mb-3 font-medium">Attack Hypothesis</h2>
        <p className="text-white leading-relaxed text-base">
          {c?.hypothesis ?? 'No hypothesis generated.'}
        </p>
      </section>

      {/* Summary */}
      {c?.summary && (
        <section className="mb-8 p-5 rounded-2xl bg-surface border border-border">
          <h2 className="text-xs uppercase tracking-widest text-muted mb-3 font-medium">Executive Summary</h2>
          <p className="text-muted leading-relaxed text-sm">{c.summary}</p>
        </section>
      )}

      {/* Timeline */}
      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-widest text-muted mb-4 font-medium">Incident Timeline</h2>
        <div className="p-5 rounded-2xl bg-surface border border-border">
          <Timeline events={c?.timeline ?? []} />
        </div>
      </section>

      {/* Evidence Table */}
      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-widest text-muted mb-4 font-medium">Evidence Table</h2>
        <EvidenceTable evidence={c?.evidence ?? []} />
      </section>

      {/* Tool Outputs Summary */}
      <section>
        <h2 className="text-xs uppercase tracking-widest text-muted mb-4 font-medium">Tool Execution Summary</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {job.tool_outputs.map((t, i) => (
            <div key={i} className={`p-4 rounded-xl border ${t.success ? 'border-border bg-surface' : 'border-red-500/30 bg-red-500/5'}`}>
              <p className="font-mono text-xs text-purple-400 mb-1">{t.tool}</p>
              <p className={`text-xs ${t.success ? 'text-accent' : 'text-red-400'}`}>
                {t.success ? '✓ Success' : '✗ Failed'}
              </p>
              {t.error && <p className="text-xs text-muted mt-1 truncate">{t.error}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
