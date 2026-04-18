import { StrictMode, useState } from 'react'
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
import NotFound from './pages/NotFound'

function App() {
  const [booted, setBooted] = useState(() => !!sessionStorage.getItem('forensix_booted'))

  const handleBootDone = () => {
    sessionStorage.setItem('forensix_booted', '1')
    setBooted(true)
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        {!booted && <BootScreen onDone={handleBootDone} />}
        <BrowserRouter>
          <Routes>
            <Route path="/"                element={<Upload />} />
            <Route path="/live/:jobId"     element={<LiveAgent />} />
            <Route path="/results/:jobId"  element={<Results />} />
            <Route path="/report/:jobId"   element={<Report />} />
            <Route path="*"               element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
