import { Component, ReactNode } from 'react'

interface Props  { children: ReactNode }
interface State  { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="scanlines min-h-screen grid-bg flex flex-col items-center justify-center px-4">
        <div className="max-w-lg w-full fade-in-up">
          <p className="text-xs font-mono text-red-500 mb-3 uppercase tracking-widest">Critical Error</p>
          <h1 className="text-3xl font-bold font-mono text-white mb-4">
            Something went <span className="text-red-400">wrong</span>
          </h1>
          <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 font-mono text-xs text-[#64748B] mb-6 break-all">
            {this.state.error.message}
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2.5 rounded-lg font-mono text-sm btn-neon cursor-pointer"
          >
            ← Restart ForensiX
          </button>
        </div>
      </div>
    )
  }
}
