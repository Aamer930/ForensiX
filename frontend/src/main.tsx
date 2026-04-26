import { StrictMode, useState, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import BootScreen from './components/BootScreen'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import Upload from './pages/Upload'
import LiveAgent from './pages/LiveAgent'
import Results from './pages/Results'
import Report from './pages/Report'
import History from './pages/History'
import NotFound from './pages/NotFound'
import { ThemeContext, useThemeState } from './lib/useTheme'

// Apply saved theme before first render to prevent flash
const savedTheme = localStorage.getItem('forensix_theme') ?? 'dark'
if (savedTheme === 'dark') document.documentElement.classList.add('dark')
else document.documentElement.classList.remove('dark')

// Global error surfaces — catches anything not handled by a try/catch
window.addEventListener('unhandledrejection', (ev) => {
  const msg = ev.reason instanceof Error ? ev.reason.message : String(ev.reason ?? 'Unknown error')
  console.error('[ForensiX] Unhandled rejection:', ev.reason)
  // Dispatch custom event so ToastProvider can pick it up
  window.dispatchEvent(new CustomEvent('forensix:error', { detail: msg }))
})
window.addEventListener('error', (ev) => {
  if (!ev.error) return
  console.error('[ForensiX] Uncaught error:', ev.error)
  window.dispatchEvent(new CustomEvent('forensix:error', { detail: ev.message }))
})

function ThemeProvider({ children }: { children: ReactNode }) {
  const themeValue = useThemeState()
  return <ThemeContext.Provider value={themeValue}>{children}</ThemeContext.Provider>
}

function App() {
  const [booted, setBooted] = useState(() => !!sessionStorage.getItem('forensix_booted'))

  const handleBootDone = () => {
    sessionStorage.setItem('forensix_booted', '1')
    setBooted(true)
  }

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <ToastProvider>
          {!booted && <BootScreen onDone={handleBootDone} />}
          <BrowserRouter>
            <Routes>
              <Route path="/"                element={<Upload />} />
              <Route path="/history"         element={<History />} />
              <Route path="/live/:jobId"     element={<LiveAgent />} />
              <Route path="/results/:jobId"  element={<Results />} />
              <Route path="/report/:jobId"   element={<Report />} />
              <Route path="*"               element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </ErrorBoundary>
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
