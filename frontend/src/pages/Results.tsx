import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getJob, type Job } from '../lib/api'
import Timeline from '../components/Timeline'
import EvidenceTable from '../components/EvidenceTable'

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-xs font-mono text-[#334155] uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-green-500/30 to-transparent" />
    </div>
  )
}

export default function Results() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const [job, setJob] = useState<Job | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!jobId) return
    getJob(jobId).then(setJob).catch(e => setError(e.message))
  }, [jobId])

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-red-400 font-mono text-sm">✗ {error}</p>
    </div>
  )

  if (!job) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
        <p className="text-xs font-mono text-[#334155]">Loading results...</p>
      </div>
    </div>
  )

  const c = job.correlation

  return (
    <div className="scanlines min-h-screen grid-bg px-4 py-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-8 fade-in-up">
        <div>
          <h1 className="text-3xl font-bold font-mono">
            <span className="neon-text">Analysis</span>
            <span className="text-white"> Results</span>
          </h1>
          <p className="text-xs font-mono text-[#334155] mt-1">
            {job.filename}
            <span className="mx-2 text-[#1E293B]">·</span>
            <span className="text-purple-400">{job.file_type}</span>
            <span className="mx-2 text-[#1E293B]">·</span>
            <span className="text-green-500">{job.status.toUpperCase()}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/report/${jobId}`)}
            className="px-4 py-2 rounded-lg font-mono text-sm btn-neon cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500/50"
          >
            Export PDF →
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-lg border border-[#1E293B] font-mono text-sm text-[#64748B] hover:border-green-500/30 hover:text-white transition-colors cursor-pointer"
          >
            ← New
          </button>
        </div>
      </div>

      {/* Hypothesis */}
      <section className="mb-6 fade-in-up-1">
        <SectionHeader label="Attack Hypothesis" />
        <div className="p-5 rounded-xl border border-[#1E293B] relative overflow-hidden"
          style={{ background: 'rgba(15,23,42,0.8)' }}>
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-500 to-transparent rounded-l-xl" />
          <p className="text-[#CBD5E1] leading-relaxed pl-3">
            {c?.hypothesis ?? 'No hypothesis generated.'}
          </p>
        </div>
      </section>

      {/* Summary */}
      {c?.summary && (
        <section className="mb-6 fade-in-up-1">
          <SectionHeader label="Executive Summary" />
          <div className="p-5 rounded-xl border border-[#1E293B]" style={{ background: 'rgba(15,23,42,0.6)' }}>
            <p className="text-[#64748B] leading-relaxed text-sm">{c.summary}</p>
          </div>
        </section>
      )}

      {/* Timeline */}
      <section className="mb-6 fade-in-up-2">
        <SectionHeader label="Incident Timeline" />
        <div className="p-5 rounded-xl border border-[#1E293B]" style={{ background: 'rgba(15,23,42,0.6)' }}>
          <Timeline events={c?.timeline ?? []} />
        </div>
      </section>

      {/* Evidence */}
      <section className="mb-6 fade-in-up-3">
        <SectionHeader label="Evidence Table" />
        <EvidenceTable evidence={c?.evidence ?? []} />
      </section>

      {/* Tool grid */}
      <section className="fade-in-up-4">
        <SectionHeader label="Tool Execution" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {job.tool_outputs.map((t, i) => (
            <div
              key={i}
              className={`p-4 rounded-xl border transition-all duration-300 card-hover ${
                t.success
                  ? 'border-[#1E293B] hover:border-green-500/30'
                  : 'border-red-500/20 bg-red-500/5'
              }`}
              style={{ background: t.success ? 'rgba(15,23,42,0.6)' : undefined }}
            >
              <p className="font-mono text-xs text-purple-400 mb-2">{t.tool}</p>
              <p className={`text-xs font-mono font-bold ${t.success ? 'text-green-400' : 'text-red-400'}`}>
                {t.success ? '✓ SUCCESS' : '✗ FAILED'}
              </p>
              {t.error && <p className="text-xs text-[#334155] mt-1 truncate font-mono">{t.error}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
