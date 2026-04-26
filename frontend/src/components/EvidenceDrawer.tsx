import { useEffect } from 'react'
import type { ToolOutput } from '../lib/api'

interface TimelineEvent {
  time: string
  event: string
  mitre_tactic?: string
  mitre_technique?: string
  tool_source?: string
}

interface Props {
  event: TimelineEvent | null
  toolOutputs: ToolOutput[]
  onClose: () => void
}

function getRelevantOutput(toolSource: string | undefined, toolOutputs: ToolOutput[]): ToolOutput | null {
  if (!toolSource) return null
  return toolOutputs.find(o => o.tool === toolSource || o.tool === toolSource.split('/')[0]) ?? null
}

function renderData(data: Record<string, unknown>): string {
  try {
    return JSON.stringify(data, null, 2).slice(0, 2000)
  } catch {
    return String(data)
  }
}

export default function EvidenceDrawer({ event, toolOutputs, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!event) return null

  const toolOutput = getRelevantOutput(event.tool_source, toolOutputs)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg z-50 flex flex-col border-l border-gray-200 dark:border-[#1E293B] bg-white dark:bg-[#020617] overflow-hidden shadow-2xl slide-in-right">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[#1E293B] bg-gray-50 dark:bg-[#0F172A]">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-gray-500 dark:text-[#334155] uppercase tracking-widest mb-0.5">Evidence Source</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{event.event.slice(0, 60)}{event.event.length > 60 ? '…' : ''}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 w-8 h-8 rounded-lg border border-gray-200 dark:border-[#1E293B] flex items-center justify-center text-gray-400 dark:text-[#475569] hover:text-gray-900 dark:hover:text-white hover:border-green-500/30 transition-colors cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Timeline event details */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-[#1E293B] space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-gray-400 dark:text-[#475569]">{event.time}</span>
            {event.mitre_tactic && event.mitre_technique && (
              <span className="px-2 py-0.5 rounded text-[9px] font-bold border border-cyan-500/30 text-cyan-400 bg-cyan-500/10 tracking-widest">
                {event.mitre_technique} · {event.mitre_tactic}
              </span>
            )}
            {event.tool_source && (
              <span className="px-2 py-0.5 rounded text-[9px] font-bold border border-purple-500/30 text-purple-400 bg-purple-500/10 font-mono">
                {event.tool_source}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-[#94A3B8] leading-relaxed">{event.event}</p>
        </div>

        {/* Raw tool output */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {toolOutput ? (
            <>
              <p className="text-[10px] font-mono text-gray-500 dark:text-[#475569] uppercase tracking-widest mb-3">
                Raw Output — {toolOutput.tool}
              </p>
              <pre className="text-[11px] font-mono text-gray-500 dark:text-[#475569] leading-relaxed whitespace-pre-wrap break-all">
                {renderData(toolOutput.data)}
              </pre>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center gap-2">
              <p className="text-xs font-mono text-gray-500 dark:text-[#475569]">
                {event.tool_source
                  ? `No raw output found for tool: ${event.tool_source}`
                  : 'No tool source linked to this event.'}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-[#334155] font-mono">
                Re-run with Claude mode for full evidence linking.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
