import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function NotFound() {
  const navigate = useNavigate()
  const [count, setCount] = useState(5)

  useEffect(() => {
    const t = setInterval(() => setCount(c => c - 1), 1000)
    const r = setTimeout(() => navigate('/'), 5000)
    return () => { clearInterval(t); clearTimeout(r) }
  }, [navigate])

  return (
    <div className="scanlines min-h-screen grid-bg flex flex-col items-center justify-center px-4">
      <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-green-500/40" />
      <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-green-500/40" />
      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-green-500/40" />
      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-green-500/40" />

      <div className="text-center fade-in-up">
        <p className="text-xs font-mono text-[#334155] mb-4 uppercase tracking-widest">Error 404</p>
        <h1 className="text-8xl font-bold font-mono neon-text mb-2">404</h1>
        <div className="h-px w-48 mx-auto bg-gradient-to-r from-transparent via-green-500/40 to-transparent mb-6" />
        <p className="text-[#64748B] font-mono text-sm mb-1">Page not found.</p>
        <p className="text-[#334155] font-mono text-xs mb-8">
          The artefact you are looking for does not exist.
        </p>

        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 rounded-lg font-mono text-sm btn-neon cursor-pointer"
        >
          ← Return to base
        </button>

        <p className="text-[#1E293B] font-mono text-xs mt-6">
          Redirecting in {count}s...
        </p>
      </div>
    </div>
  )
}
