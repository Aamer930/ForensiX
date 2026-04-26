import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePageTitle } from '../lib/usePageTitle'
import { useToast } from '../components/Toast'
import ThemeToggle from '../components/ThemeToggle'

export default function History() {
  const [history, setHistory] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { toast } = useToast()
  usePageTitle('Case History')

  useEffect(() => {
    fetch('/api/history')
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load history (${res.status})`)
        return res.json()
      })
      .then(data => setHistory(data))
      .catch((e: Error) => {
        setError(e.message)
        toast(e.message, 'error')
      })
  }, [])

  return (
    <div className="scanlines min-h-screen grid-bg px-4 py-8 max-w-4xl mx-auto bg-white dark:bg-[#020617] text-gray-900 dark:text-white">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold font-mono">
          <span className="neon-text">Case</span>
          <span className="text-gray-900 dark:text-white"> History</span>
        </h1>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-[#1E293B] font-mono text-sm text-gray-500 dark:text-[#64748B] hover:border-green-500/30 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 cursor-pointer active:scale-95 active:transition-none"
          >
            ← New Analysis
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-mono">
          ✗ {error}
        </div>
      )}

      <div className="space-y-4">
        {!error && history.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-500 dark:text-[#64748B] font-mono text-sm mb-2">// No cases saved yet</p>
            <p className="text-gray-400 dark:text-[#334155] font-mono text-xs">Upload and analyse an artifact to create a case record.</p>
          </div>
        ) : (
          history.map((job, i) => (
            <div key={i}
                 onClick={() => navigate(`/results/${job.job_id}`)}
                 className="p-5 rounded-xl border border-gray-200 dark:border-[#1E293B] bg-gray-50 dark:bg-[#0F172A]/60 card-hover flex justify-between items-center cursor-pointer">
              <div>
                <p className="text-gray-900 dark:text-[#F8FAFC] font-mono font-bold mb-1">{job.filename}</p>
                <p className="text-xs text-gray-500 dark:text-[#64748B] font-mono">{job.job_id}</p>
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                  job.status === 'complete' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
                }`}>
                  {job.status}
                </span>
                <p className="text-xs text-gray-500 dark:text-[#64748B] font-mono mt-2">{job.file_type}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
