import { useParams, useNavigate } from 'react-router-dom'
import { getReportUrl } from '../lib/api'

export default function Report() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const reportUrl = getReportUrl(jobId!)

  return (
    <div className="scanlines min-h-screen grid-bg px-4 py-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 fade-in-up">
        <div>
          <h1 className="text-2xl font-bold font-mono">
            <span className="neon-text">Forensic</span>
            <span className="text-white"> Report</span>
          </h1>
          <p className="text-xs font-mono text-[#334155] mt-0.5">
            JOB/<span className="text-[#475569]">{jobId?.slice(0, 12)}...</span>
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href={reportUrl}
            download={`forensix-report-${jobId?.slice(0, 8)}.pdf`}
            className="px-5 py-2.5 rounded-lg font-mono text-sm btn-neon cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500/50"
          >
            ↓ Download PDF
          </a>
          <button
            onClick={() => navigate(`/results/${jobId}`)}
            className="px-4 py-2 rounded-lg border border-[#1E293B] font-mono text-sm text-[#64748B] hover:border-green-500/30 hover:text-white transition-colors cursor-pointer"
          >
            ← Results
          </button>
        </div>
      </div>

      {/* PDF preview */}
      <div className="rounded-xl border border-[#1E293B] overflow-hidden fade-in-up-1"
        style={{ height: '78vh' }}>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#1E293B] bg-[#0F172A]">
          <span className="w-2 h-2 rounded-full bg-green-500 pulse-glow" />
          <span className="text-xs font-mono text-[#334155]">forensix-report.pdf</span>
          <span className="ml-auto text-xs font-mono text-[#1E293B]">PDF PREVIEW</span>
        </div>
        <iframe
          src={reportUrl}
          className="w-full bg-white"
          style={{ height: 'calc(100% - 40px)' }}
          title="ForensiX PDF Report"
        />
      </div>

      <p className="text-center text-[#1E293B] text-xs font-mono mt-4 fade-in-up-2">
        If preview doesn't load — use the Download button above
      </p>
    </div>
  )
}
