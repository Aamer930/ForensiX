import { useEffect, useRef, useState } from 'react'

export interface StreamEvent {
  type: 'step_start' | 'step_done' | 'step_error' | 'llm_thinking' | 'llm_reason' | 'complete' | 'error'
  tool?: string
  message: string
  data?: Record<string, unknown>
  ts?: number
}

interface Props {
  events: StreamEvent[]
}

const TYPE_COLOR: Record<string, string> = {
  step_start:   'text-yellow-400',
  step_done:    'text-green-400',
  step_error:   'text-red-400',
  llm_thinking: 'text-cyan-400',
  llm_reason:   'text-purple-300',
  complete:     'text-green-300',
  error:        'text-red-500',
}

const TYPE_LABEL: Record<string, string> = {
  step_start:   'EXEC',
  step_done:    'DONE',
  step_error:   'FAIL',
  llm_thinking: ' AI ',
  llm_reason:   'THINK',
  complete:     ' OK ',
  error:        'ERR ',
}

const BADGE_STYLE: Record<string, string> = {
  step_start:   'border-yellow-500/30 text-yellow-400  bg-yellow-500/10',
  step_done:    'border-green-500/30  text-green-400   bg-green-500/10',
  step_error:   'border-red-500/30    text-red-400     bg-red-500/10',
  llm_thinking: 'border-cyan-500/30   text-cyan-400    bg-cyan-500/10',
  llm_reason:   'border-purple-500/30 text-purple-300  bg-purple-500/10',
  complete:     'border-green-400/40  text-green-300   bg-green-400/10',
  error:        'border-red-500/30    text-red-500     bg-red-500/10',
}

function timestamp(ts?: number) {
  const d = ts ? new Date(ts) : new Date()
  return d.toLocaleTimeString('en-US', { hour12: false })
}

function ReasonRow({ ev }: { ev: StreamEvent }) {
  const [expanded, setExpanded] = useState(false)
  const data = ev.data as { step?: number; chosen_tool?: string; reasoning?: string; findings_so_far?: string } | undefined

  return (
    <div className="flex flex-col my-1 rounded bg-purple-500/5 px-2 py-1">
      <div
        className="flex items-start gap-2 leading-relaxed cursor-pointer group"
        onClick={() => setExpanded(v => !v)}
      >
        <span className="text-gray-400 dark:text-[#475569] shrink-0 w-20 text-[10px] pt-0.5">{timestamp(ev.ts)}</span>
        <span className={`shrink-0 px-1 rounded text-[10px] font-bold border ${BADGE_STYLE['llm_reason']}`}>
          THINK
        </span>
        {ev.tool && <span className="shrink-0 text-purple-400 text-[11px]">[{ev.tool}]</span>}
        <span className="text-purple-300 text-[11px] flex-1">
          {data?.reasoning
            ? (data.reasoning.length > 90 && !expanded)
              ? data.reasoning.slice(0, 90) + '…'
              : data.reasoning
            : ev.message}
        </span>
        <span className="text-gray-400 dark:text-[#475569] text-[10px] shrink-0 group-hover:text-gray-600 dark:group-hover:text-[#64748B]">{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && data?.findings_so_far && data.findings_so_far !== 'No findings yet.' && (
        <div className="text-[10px] font-mono text-gray-400 dark:text-[#475569] pb-1 pt-0.5" style={{ marginLeft: '88px' }}>
          ↳ {data.findings_so_far.slice(0, 200)}
        </div>
      )}
    </div>
  )
}

export default function TerminalStream({ events }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events])

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-[#1E293B] bg-gray-50 dark:bg-[#020617]">

      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200 dark:border-[#1E293B] bg-gray-100 dark:bg-[#0F172A]">
        <span className="w-3 h-3 rounded-full bg-red-500/70" />
        <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <span className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-3 text-xs font-mono text-gray-400 dark:text-[#475569]">forensix-agent — iterative mode</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 pulse-glow" />
          <span className="text-xs font-mono text-gray-400 dark:text-[#475569]">LIVE</span>
        </div>
      </div>

      {/* Output */}
      <div className="font-mono text-xs p-4 h-80 overflow-y-auto space-y-0.5 bg-white dark:bg-[#020617]/95">
        <div className="text-gray-400 dark:text-[#475569] mb-2">
          <span className="text-green-500">forensix</span>
          <span className="text-gray-400 dark:text-[#475569]">@agent</span>
          <span className="text-gray-900 dark:text-white">:~$</span>
          <span className="text-gray-500 dark:text-[#64748B] ml-2">./forensix-agent --mode=iterative --max-steps=10</span>
        </div>

        {events.length === 0 && (
          <span className="text-gray-400 dark:text-[#475569]">Waiting for artifact...<span className="cursor-blink">▌</span></span>
        )}

        {events.map((ev, i) => {
          if (ev.type === 'llm_reason') {
            return <ReasonRow key={i} ev={ev} />
          }
          return (
            <div key={i} className="flex items-start gap-2 leading-relaxed group">
              <span className="text-gray-400 dark:text-[#475569] shrink-0 w-20 group-hover:text-gray-600 dark:group-hover:text-[#64748B] transition-colors duration-150 text-[10px] pt-0.5">
                {timestamp(ev.ts)}
              </span>
              <span className={`shrink-0 px-1 rounded text-[10px] font-bold border ${BADGE_STYLE[ev.type] ?? 'border-gray-200 dark:border-[#1E293B] text-gray-400 dark:text-[#475569]'}`}>
                {TYPE_LABEL[ev.type] ?? 'INFO'}
              </span>
              {ev.tool && <span className="shrink-0 text-purple-400 text-[11px]">[{ev.tool}]</span>}
              <span className={`${TYPE_COLOR[ev.type] ?? 'text-[#94A3B8]'} text-[11px]`}>
                {ev.message}
              </span>
            </div>
          )
        })}

        {events.length > 0 &&
          events[events.length - 1].type !== 'complete' &&
          events[events.length - 1].type !== 'error' && (
            <div className="flex items-center gap-2 text-gray-400 dark:text-[#475569]">
              <span className="w-20" />
              <span className="cursor-blink">▌</span>
            </div>
          )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
