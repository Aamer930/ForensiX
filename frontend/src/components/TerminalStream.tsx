import { useEffect, useRef } from 'react'

export interface StreamEvent {
  type: 'step_start' | 'step_done' | 'step_error' | 'llm_thinking' | 'complete' | 'error'
  tool?: string
  message: string
  data?: Record<string, unknown>
  ts?: number
}

interface Props {
  events: StreamEvent[]
}

const TYPE_STYLE: Record<string, string> = {
  step_start:   'text-yellow-400',
  step_done:    'text-accent',
  step_error:   'text-red-400',
  llm_thinking: 'text-blue-400',
  complete:     'text-green-400',
  error:        'text-red-500',
}

const TYPE_PREFIX: Record<string, string> = {
  step_start:   '⟳',
  step_done:    '✓',
  step_error:   '✗',
  llm_thinking: '◆',
  complete:     '★',
  error:        '✗',
}

export default function TerminalStream({ events }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events])

  return (
    <div className="bg-[#0D1117] border border-border rounded-xl font-mono text-sm p-4 h-96 overflow-y-auto">
      <div className="text-muted text-xs mb-3">forensix@agent:~$ ./run_analysis.sh</div>
      {events.map((ev, i) => (
        <div key={i} className="flex gap-2 mb-1 leading-relaxed">
          <span className="text-muted text-xs w-5 shrink-0 mt-0.5">
            {TYPE_PREFIX[ev.type] ?? '·'}
          </span>
          <span>
            {ev.tool && (
              <span className="text-purple-400 mr-2">[{ev.tool}]</span>
            )}
            <span className={TYPE_STYLE[ev.type] ?? 'text-white'}>
              {ev.message}
            </span>
          </span>
        </div>
      ))}
      {events.length === 0 && (
        <span className="text-muted">Waiting for agent to start...</span>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
