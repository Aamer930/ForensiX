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

const TYPE_COLOR: Record<string, string> = {
  step_start:   'text-yellow-400',
  step_done:    'text-green-400',
  step_error:   'text-red-400',
  llm_thinking: 'text-cyan-400',
  complete:     'text-green-300',
  error:        'text-red-500',
}

const TYPE_ICON: Record<string, string> = {
  step_start:   '►',
  step_done:    '✓',
  step_error:   '✗',
  llm_thinking: '◆',
  complete:     '★',
  error:        '✗',
}

const TYPE_LABEL: Record<string, string> = {
  step_start:   'EXEC',
  step_done:    'DONE',
  step_error:   'FAIL',
  llm_thinking: ' AI ',
  complete:     ' OK ',
  error:        'ERR ',
}

function timestamp() {
  return new Date().toLocaleTimeString('en-US', { hour12: false })
}

export default function TerminalStream({ events }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events])

  return (
    <div className="relative rounded-xl overflow-hidden border border-[#1E293B]"
      style={{ background: 'rgba(2,6,23,0.95)' }}>

      {/* Terminal title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#1E293B] bg-[#0F172A]">
        <span className="w-3 h-3 rounded-full bg-red-500/70" />
        <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <span className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-3 text-xs font-mono text-[#334155]">forensix-agent — bash</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 pulse-glow" />
          <span className="text-xs font-mono text-[#334155]">LIVE</span>
        </div>
      </div>

      {/* Output area */}
      <div className="font-mono text-xs p-4 h-80 overflow-y-auto space-y-1">
        {/* Boot line */}
        <div className="text-[#334155] mb-2">
          <span className="text-green-500">forensix</span>
          <span className="text-[#475569]">@agent</span>
          <span className="text-white">:~$</span>
          <span className="text-[#64748B] ml-2">./forensix-agent --auto-mode</span>
        </div>

        {events.length === 0 && (
          <span className="text-[#334155]">Waiting for artifact...<span className="cursor-blink">▌</span></span>
        )}

        {events.map((ev, i) => (
          <div key={i} className="flex items-start gap-2 leading-relaxed group">
            {/* Timestamp */}
            <span className="text-[#334155] shrink-0 w-20 group-hover:text-[#475569] transition-colors duration-150">
              {timestamp()}
            </span>

            {/* Type badge */}
            <span className={`shrink-0 px-1 rounded text-[10px] font-bold border ${
              ev.type === 'step_done'    ? 'border-green-500/30 text-green-400  bg-green-500/10'  :
              ev.type === 'step_error'   ? 'border-red-500/30   text-red-400    bg-red-500/10'    :
              ev.type === 'llm_thinking' ? 'border-cyan-500/30  text-cyan-400   bg-cyan-500/10'   :
              ev.type === 'complete'     ? 'border-green-400/40 text-green-300  bg-green-400/10'  :
              ev.type === 'error'        ? 'border-red-500/30   text-red-500    bg-red-500/10'    :
                                          'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
            }`}>
              {TYPE_LABEL[ev.type] ?? 'INFO'}
            </span>

            {/* Tool tag */}
            {ev.tool && (
              <span className="shrink-0 text-purple-400">[{ev.tool}]</span>
            )}

            {/* Message */}
            <span className={TYPE_COLOR[ev.type] ?? 'text-[#94A3B8]'}>
              {ev.message}
            </span>
          </div>
        ))}

        {events.length > 0 && events[events.length - 1].type !== 'complete' && events[events.length - 1].type !== 'error' && (
          <div className="flex items-center gap-2 text-[#334155]">
            <span className="w-20" />
            <span className="cursor-blink">▌</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
