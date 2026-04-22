import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getJob, type Job } from '../lib/api'
import Timeline from '../components/Timeline'
import EvidenceTable from '../components/EvidenceTable'
import ThreatGraph from '../components/ThreatGraph'
import ThreatRiskScore from '../components/ThreatRiskScore'
import MitreHeatmap from '../components/MitreHeatmap'
import ResultsSkeleton from '../components/ResultsSkeleton'
import { usePageTitle } from '../lib/usePageTitle'
import { useToast } from '../components/Toast'

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
  const { toast } = useToast()
  const [job, setJob] = useState<Job | null>(null)
  const [error, setError] = useState<string | null>(null)
  usePageTitle('Results')

  useEffect(() => {
    if (!jobId) return
    getJob(jobId)
      .then(j => { setJob(j); toast('Analysis results loaded', 'success') })
      .catch(e => { setError(e.message); toast(e.message, 'error') })
  }, [jobId])

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-red-400 font-mono text-sm">✗ {error}</p>
    </div>
  )

  if (!job) return <ResultsSkeleton />

  const c = job.correlation

  return (
    <div className="scanlines min-h-screen grid-bg px-4 py-8 max-w-5xl mx-auto">

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

      {/* Risk Score + Hypothesis side-by-side */}
      <section className="mb-6 fade-in-up-1">
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
          {/* Risk Score Gauge */}
          <ThreatRiskScore score={c?.risk_score ?? 0} />
          
          {/* Hypothesis */}
          <div>
            <SectionHeader label="Attack Hypothesis" />
            <div className="p-5 rounded-xl border border-[#1E293B] relative overflow-hidden h-full"
              style={{ background: 'rgba(15,23,42,0.8)' }}>
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-500 to-transparent rounded-l-xl" />
              <p className="text-[#CBD5E1] leading-relaxed pl-3">
                {c?.hypothesis ?? 'No hypothesis generated.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MITRE ATT&CK Heatmap */}
      <section className="mb-6 fade-in-up-1">
        <SectionHeader label="MITRE ATT&CK Coverage" />
        <MitreHeatmap
          tactics={c?.mitre_tactics ?? []}
          timeline={c?.timeline ?? []}
        />
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

      {/* Threat Graph */}
      <section className="mb-6 fade-in-up-3">
        <SectionHeader label="Interactive Threat Graph" />
        <ThreatGraph 
          suspiciousStrings={c?.suspicious_strings ?? []} 
          evidence={c?.evidence ?? []} 
        />
      </section>

      {/* Evidence */}
      <section className="mb-6 fade-in-up-4">
        <SectionHeader label="Evidence Table" />
        <EvidenceTable evidence={c?.evidence ?? []} />
      </section>

      {/* Suspicious Strings */}
      {(c?.suspicious_strings?.length ?? 0) > 0 && (
        <section className="mb-6 fade-in-up-3">
          <SectionHeader label="Suspicious Strings" />
          <div className="space-y-2">
            {c!.suspicious_strings.map((s, i) => {
              const sev = {
                critical: { bg: 'bg-red-500/10', border: 'border-red-500/40', badge: 'bg-red-500/20 text-red-400 border-red-500/40', dot: 'bg-red-500' },
                high:     { bg: 'bg-orange-500/10', border: 'border-orange-500/40', badge: 'bg-orange-500/20 text-orange-400 border-orange-500/40', dot: 'bg-orange-500' },
                medium:   { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-400' },
                low:      { bg: 'bg-blue-500/10', border: 'border-blue-500/30', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30', dot: 'bg-blue-400' },
              }[s.severity] ?? { bg: 'bg-[#0F172A]', border: 'border-[#1E293B]', badge: 'bg-[#1E293B] text-[#64748B] border-[#1E293B]', dot: 'bg-[#334155]' }
              return (
                <div key={i} className={`p-4 rounded-xl border ${sev.bg} ${sev.border} flex gap-4 items-start`}>
                  <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${sev.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <code className="text-sm font-mono text-white break-all">{s.value}</code>
                      <span className={`px-2 py-0.5 rounded border text-xs font-mono uppercase flex-shrink-0 ${sev.badge}`}>
                        {s.severity}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] leading-relaxed">{s.reason}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

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
