import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getReportUrl } from '../lib/api'
import { usePageTitle } from '../lib/usePageTitle'

export default function Report() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const downloadUrl = getReportUrl(jobId!)
  const previewUrl = `${downloadUrl}/preview`
  const [previewFailed, setPreviewFailed] = useState(false)
  usePageTitle('Report')

  const openInTab = () => window.open(previewUrl, '_blank')

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
          <button
            onClick={openInTab}
            className="px-4 py-2 rounded-lg border border-[#1E293B] font-mono text-sm text-[#64748B] hover:border-green-500/30 hover:text-white transition-colors cursor-pointer"
          >
            ↗ Open in Tab
          </button>
          <a
            href={downloadUrl}
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

      {/* PDF viewer */}
      <div className="rounded-xl border border-[#1E293B] overflow-hidden fade-in-up-1" style={{ height: '78vh' }}>
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#1E293B] bg-[#0F172A]">
          <span className="w-2 h-2 rounded-full bg-green-500 pulse-glow" />
          <span className="text-xs font-mono text-[#334155]">forensix-report.pdf</span>
          <span className="ml-auto text-xs font-mono text-[#1E293B]">PDF PREVIEW</span>
        </div>

        {previewFailed ? (
          /* Fallback when browser blocks PDF embed */
          <div className="flex flex-col items-center justify-center h-full gap-6 bg-[#0A1628]">
            <div className="text-center">
              <p className="text-4xl mb-4">📄</p>
              <p className="text-white font-mono font-bold text-lg mb-2">PDF Ready</p>
              <p className="text-[#475569] font-mono text-sm mb-6">
                Your browser blocked inline preview. Use the buttons below.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={openInTab}
                className="px-6 py-3 rounded-lg border border-green-500/40 font-mono text-sm text-green-400 hover:bg-green-500/10 transition-colors cursor-pointer"
              >
                ↗ Open in New Tab
              </button>
              <a
                href={downloadUrl}
                download={`forensix-report-${jobId?.slice(0, 8)}.pdf`}
                className="px-6 py-3 rounded-lg font-mono text-sm btn-neon cursor-pointer"
              >
                ↓ Download PDF
              </a>
            </div>
          </div>
        ) : (
          <object
            data={previewUrl}
            type="application/pdf"
            className="w-full bg-white"
            style={{ height: 'calc(100% - 40px)' }}
            onError={() => setPreviewFailed(true)}
          >
            {/* Fallback for browsers that don't support <object> PDF */}
            <iframe
              src={previewUrl}
              className="w-full h-full border-0 bg-white"
              title="ForensiX PDF Report"
              onError={() => setPreviewFailed(true)}
            />
          </object>
        )}
      </div>

      <p className="text-center text-[#1E293B] text-xs font-mono mt-4 fade-in-up-2">
        If preview is blank — click <span className="text-[#334155]">Open in Tab</span> or <span className="text-[#334155]">Download PDF</span>
      </p>
    </div>
  )
}
