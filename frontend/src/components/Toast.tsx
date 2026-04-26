import { useEffect, useState, useRef, createContext, useContext, useCallback, ReactNode } from 'react'

interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastContextType {
  toast: (message: string, type?: ToastItem['type']) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counterRef = useRef(0)

  const toast = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = ++counterRef.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  useEffect(() => {
    const handler = (ev: Event) => {
      toast((ev as CustomEvent<string>).detail, 'error')
    }
    window.addEventListener('forensix:error', handler)
    return () => window.removeEventListener('forensix:error', handler)
  }, [toast])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast }: { toast: ToastItem }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const color =
    toast.type === 'success' ? 'border-green-500/40 bg-green-500/10 text-green-400' :
    toast.type === 'error'   ? 'border-red-500/40   bg-red-500/10   text-red-400'   :
                               'border-cyan-500/40  bg-cyan-500/10  text-cyan-400'

  const icon =
    toast.type === 'success' ? '✓' :
    toast.type === 'error'   ? '✗' : '◆'

  return (
    <div
      className={`
        pointer-events-auto px-4 py-3 rounded-lg border font-mono text-xs
        flex items-center gap-2 transition-all duration-300
        ${color}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
      style={{ backdropFilter: 'blur(8px)', background: 'rgba(2,6,23,0.9)' }}
    >
      <span>{icon}</span>
      {toast.message}
    </div>
  )
}
