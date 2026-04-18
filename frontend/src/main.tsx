import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Upload from './pages/Upload'
import LiveAgent from './pages/LiveAgent'
import Results from './pages/Results'
import Report from './pages/Report'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Upload />} />
        <Route path="/live/:jobId" element={<LiveAgent />} />
        <Route path="/results/:jobId" element={<Results />} />
        <Route path="/report/:jobId" element={<Report />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
