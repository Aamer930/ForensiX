import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getJob, recorrelateJob, type Job, type TimelineEvent } from '../lib/api'
import Timeline from '../components/Timeline'
import EvidenceTable from '../components/EvidenceTable'
import ThreatGraph from '../components/ThreatGraph'
import ThreatRiskScore from '../components/ThreatRiskScore'
import MitreHeatmap from '../components/MitreHeatmap'
import EntropyChart from '../components/EntropyChart'
import ResultsSkeleton from '../components/ResultsSkeleton'
import HypothesisPanel from '../components/HypothesisPanel'
import AdversaryCard from '../components/AdversaryCard'
import EvidenceDrawer from '../components/EvidenceDrawer'
import ThemeToggle from '../components/ThemeToggle'
import { usePageTitle } from '../lib/usePageTitle'
import { useToast } from '../components/Toast'

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-xs font-mono text-gray-500 dark:text-[#64748B] uppercase tracking-widest">{label}</span>
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
  const [drawerEvent, setDrawerEvent] = useState<TimelineEvent | null>(null)
  const [reasoningOpen, setReasoningOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editedTimeline, setEditedTimeline] = useState<TimelineEvent[]>([])
  const [recorrelating, setRecorrelating] = useState(false)
  usePageTitle('Results')

  const handleEnterEditMode = () => {
    setEditedTimeline(job?.correlation?.timeline ?? [])
    setEditMode(true)
  }

  const handleDeleteEvent = (index: number) => {
    setEditedTimeline(prev => prev.filter((_, i) => i !== index))
  }

  const handleRecorrelate = async () => {
    if (!jobId) return
    setRecorrelating(true)
    try {
      const result = await recorrelateJob(jobId, editedTimeline)
      setJob(prev => prev ? { ...prev, correlation: result.correlation } : prev)
      setEditMode(false)
      toast('Timeline updated — report regenerated', 'success')
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setRecorrelating(false)
    }
  }

  useEffect(() => {
    if (!jobId) return
    getJob(jobId)
      .then(j => setJob(j))
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
    <div className="scanlines min-h-screen grid-bg px-4 py-8 max-w-5xl mx-auto bg-white dark:bg-[#020617] text-gray-900 dark:text-white">

      {/* Header */}
      <div className="flex items-start justify-between mb-8 fade-in-up">
        <div>
          <h1 className="text-3xl font-bold font-mono">
            <span className="neon-text">Analysis</span>
            <span className="text-gray-900 dark:text-white"> Results</span>
          </h1>
          <p className="text-xs font-mono text-gray-500 dark:text-[#475569] mt-1">
            {job.filename}
            <span className="mx-2 text-gray-400 dark:text-[#1E293B]">·</span>
            <span className="text-purple-400">{job.file_type}</span>
            <span className="mx-2 text-gray-400 dark:text-[#1E293B]">·</span>
            <span className="text-green-500">{job.status.toUpperCase()}</span>
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <ThemeToggle />
          <button
            onClick={() => navigate(`/report/${jobId}`)}
            className="px-4 py-2 rounded-lg font-mono text-sm btn-neon cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500/50"
          >
            Export PDF →
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-[#1E293B] font-mono text-sm text-gray-500 dark:text-[#64748B] hover:border-green-500/30 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 cursor-pointer active:scale-95 active:transition-none"
          >
            ← New
          </button>
        </div>
      </div>

      {/* Risk Score + Attack Hypotheses */}
      <section className="mb-6 fade-in-up-1">
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
          <ThreatRiskScore score={c?.risk_score ?? 0} />
          <div>
            <SectionHeader label="Attack Hypotheses" />
            <HypothesisPanel
              primary={c?.hypothesis ?? 'No hypothesis generated.'}
              hypotheses={c?.hypotheses ?? []}
            />
          </div>
        </div>
      </section>

      {/* File Entropy — only shown when entropy tool ran successfully */}
      {job.tool_outputs.some(t => t.tool === 'entropy' && t.success) && (
        <section className="mb-6 fade-in-up-1">
          <SectionHeader label="File Entropy Analysis" />
          <EntropyChart toolOutputs={job.tool_outputs} />
        </section>
      )}

      {/* MITRE ATT&CK Heatmap */}
      <section className="mb-6 fade-in-up-1">
        <SectionHeader label="MITRE ATT&CK Coverage" />
        <MitreHeatmap
          tactics={c?.mitre_tactics ?? []}
          timeline={c?.timeline ?? []}
        />
      </section>

      {/* Adversary Attribution */}
      {c?.adversary && (
        <section className="mb-6 fade-in-up-1">
          <SectionHeader label="Adversary Attribution" />
          <AdversaryCard adversary={c.adversary} />
        </section>
      )}

      {/* Summary */}
      {c?.summary && (
        <section className="mb-6 fade-in-up-1">
          <SectionHeader label="Executive Summary" />
          <div className="p-5 rounded-xl border border-gray-200 dark:border-[#1E293B] bg-gray-50 dark:bg-[#0F172A]/60">
            <p className="text-gray-500 dark:text-[#64748B] leading-relaxed text-sm">{c.summary}</p>
          </div>
        </section>
      )}

      {/* Timeline — click to view evidence */}
      <section className="mb-6 fade-in-up-2">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono text-gray-500 dark:text-[#64748B] uppercase tracking-widest">Incident Timeline</span>
          <div className="flex items-center gap-2">
            {!editMode ? (
              <button
                onClick={handleEnterEditMode}
                className="px-3 py-1.5 rounded border border-gray-200 dark:border-[#1E293B] text-xs font-mono text-gray-500 dark:text-[#64748B] hover:border-yellow-500/40 hover:text-yellow-400 transition-colors"
              >
                ✎ Edit Timeline
              </button>
            ) : (
              <>
                <span className="text-xs font-mono text-gray-400 dark:text-[#475569]">{editedTimeline.length} events</span>
                <button
                  onClick={() => setEditMode(false)}
                  className="px-3 py-1.5 rounded border border-gray-200 dark:border-[#1E293B] text-xs font-mono text-gray-500 dark:text-[#64748B] hover:border-red-500/30 hover:text-red-400 transition-colors"
                >
                  ✕ Cancel
                </button>
                <button
                  onClick={handleRecorrelate}
                  disabled={recorrelating || editedTimeline.length === 0}
                  className="px-3 py-1.5 rounded border border-green-500/40 text-xs font-mono text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {recorrelating ? '↻ Re-correlating...' : '↻ Re-Correlate & Update Report'}
                </button>
              </>
            )}
          </div>
        </div>
        <div className="p-5 rounded-xl border border-gray-200 dark:border-[#1E293B] bg-gray-50 dark:bg-[#0F172A]/60">
          <Timeline
            events={editMode ? editedTimeline : (c?.timeline ?? [])}
            onEventClick={editMode ? undefined : ev => setDrawerEvent(ev)}
            editMode={editMode}
            onDeleteEvent={editMode ? handleDeleteEvent : undefined}
          />
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
              }[s.severity] ?? { bg: 'bg-gray-50 dark:bg-[#0F172A]', border: 'border-gray-200 dark:border-[#1E293B]', badge: 'bg-gray-100 dark:bg-[#1E293B] text-gray-500 dark:text-[#64748B] border-gray-200 dark:border-[#1E293B]', dot: 'bg-gray-300 dark:bg-[#334155]' }
              return (
                <div key={i} className={`p-4 rounded-xl border ${sev.bg} ${sev.border} flex gap-4 items-start`}>
                  <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${sev.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <code className="text-sm font-mono text-gray-900 dark:text-white break-all">{s.value}</code>
                      <span className={`px-2 py-0.5 rounded border text-xs font-mono uppercase flex-shrink-0 ${sev.badge}`}>
                        {s.severity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-[#64748B] leading-relaxed">{s.reason}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Tool grid */}
      <section className="mb-6 fade-in-up-4">
        <SectionHeader label="Tool Execution" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {job.tool_outputs.map((t, i) => (
            <div
              key={i}
              className={`p-4 rounded-xl border transition-all duration-300 card-hover ${
                t.success
                  ? 'border-gray-200 dark:border-[#1E293B] hover:border-green-500/30 bg-gray-50 dark:bg-[#0F172A]/60'
                  : 'border-red-500/20 bg-red-500/5'
              }`}
            >
              <p className="font-mono text-xs text-purple-400 mb-2">{t.tool}</p>
              <p className={`text-xs font-mono font-bold ${t.success ? 'text-green-400' : 'text-red-400'}`}>
                {t.success ? '✓ SUCCESS' : '✗ FAILED'}
              </p>
              {t.error && <p className="text-xs text-gray-400 dark:text-[#475569] mt-1 truncate font-mono">{t.error}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Agent Reasoning Log */}
      {(job.agent_reasoning?.length ?? 0) > 0 && (
        <section className="mb-6 fade-in-up-4">
          <SectionHeader label="Agent Reasoning Log" />
          <div className="rounded-xl border border-gray-200 dark:border-[#1E293B] overflow-hidden">
            <button
              onClick={() => setReasoningOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-[#0F172A] hover:bg-gray-100 dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
            >
              <span className="text-xs font-mono text-gray-400 dark:text-[#475569]">
                {job.agent_reasoning.length} decision{job.agent_reasoning.length !== 1 ? 's' : ''} — click to {reasoningOpen ? 'collapse' : 'expand'}
              </span>
              <span className="text-gray-400 dark:text-[#475569] text-xs">{reasoningOpen ? '▲' : '▼'}</span>
            </button>
            {reasoningOpen && (
              <div className="divide-y divide-gray-100 dark:divide-[#1E293B]">
                {job.agent_reasoning.map((step, i) => (
                  <div key={i} className="px-4 py-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-gray-500 dark:text-[#475569]">STEP {step.step}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border border-purple-500/30 text-purple-300 bg-purple-500/10 font-mono">
                        {step.chosen_tool}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-[#64748B] leading-relaxed">{step.reasoning}</p>
                    {step.findings_so_far && step.findings_so_far !== 'No findings yet.' && (
                      <p className="text-[10px] text-gray-400 dark:text-[#475569] font-mono">↳ {step.findings_so_far.slice(0, 150)}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Evidence drawer */}
      <EvidenceDrawer
        event={drawerEvent}
        toolOutputs={job.tool_outputs}
        onClose={() => setDrawerEvent(null)}
      />
    </div>
  )
}
