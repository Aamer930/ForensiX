import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePageTitle } from '../lib/usePageTitle'

export default function History() {
  const [history, setHistory] = useState<any[]>([])
  const navigate = useNavigate()
  usePageTitle('Case History')

  useEffect(() => {
    fetch('/api/history')
      .then(res => res.json())
      .then(data => setHistory(data))
      .catch(() => {})
  }, [])

  return (
    <div className="scanlines min-h-screen grid-bg px-4 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold font-mono">
          <span className="neon-text">Case</span>
          <span className="text-white"> History</span>
        </h1>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-lg border border-[#1E293B] font-mono text-sm text-[#64748B] hover:border-green-500/30 hover:text-white transition-colors duration-200 cursor-pointer active:scale-95 active:transition-none"
        >
          ← New Analysis
        </button>
      </div>

      <div className="space-y-4">
        {history.length === 0 ? (
          <p className="text-[#64748B] font-mono text-sm">No cases saved in SQLite database yet.</p>
        ) : (
          history.map((job, i) => (
            <div key={i} 
                 onClick={() => navigate(`/results/${job.job_id}`)}
                 className="p-5 rounded-xl border border-[#1E293B] bg-[#0F172A]/60 card-hover flex justify-between items-center cursor-pointer">
              <div>
                <p className="text-[#F8FAFC] font-mono font-bold mb-1">{job.filename}</p>
                <p className="text-xs text-[#64748B] font-mono">{job.job_id}</p>
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                  job.status === 'complete' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
                }`}>
                  {job.status}
                </span>
                <p className="text-xs text-[#64748B] font-mono mt-2">{job.file_type}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
