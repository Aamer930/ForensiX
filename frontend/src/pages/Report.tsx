import { useParams, useNavigate } from 'react-router-dom'
import { getReportUrl } from '../lib/api'

export default function Report() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const reportUrl = getReportUrl(jobId!)

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="text-accent">Forensic</span> Report
          </h1>
          <p className="text-muted text-sm font-mono mt-0.5">job/{jobId?.slice(0, 8)}...</p>
        </div>
        <div className="flex gap-3">
          <a
            href={reportUrl}
            download={`forensix-report-${jobId?.slice(0, 8)}.pdf`}
            className="px-5 py-2.5 rounded-xl bg-accent text-dark font-semibold text-sm hover:bg-accent/90 transition-colors"
          >
            ↓ Download PDF
          </a>
          <button
            onClick={() => navigate(`/results/${jobId}`)}
            className="px-4 py-2 rounded-xl bg-surface border border-border text-sm text-white hover:border-accent/50 transition-colors"
          >
            ← Back to Results
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden bg-white" style={{ height: '80vh' }}>
        <iframe
          src={reportUrl}
          className="w-full h-full"
          title="ForensiX PDF Report"
        />
      </div>

      <p className="text-muted text-xs text-center mt-4">
        If the preview doesn't load, use the Download button above.
      </p>
    </div>
  )
}
