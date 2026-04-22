const BASE = '/api'

export interface UploadResponse {
  job_id: string
  filename: string
  file_type: string
}

export interface Job {
  job_id: string
  status: 'pending' | 'running' | 'complete' | 'failed'
  filename: string
  file_type: string | null
  correlation: Correlation | null
  tool_outputs: ToolOutput[]
  error: string | null
}

export interface Correlation {
  timeline: { time: string; event: string; mitre_tactic?: string; mitre_technique?: string }[]
  hypothesis: string
  evidence: { finding: string; source: string; confidence: number }[]
  summary: string
  suspicious_strings: { value: string; reason: string; severity: 'critical' | 'high' | 'medium' | 'low' }[]
  risk_score: number
  mitre_tactics: string[]
}

export interface ToolOutput {
  tool: string
  success: boolean
  data: Record<string, unknown>
  error: string | null
}

export async function uploadFile(file: File): Promise<UploadResponse> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export interface SampleInfo {
  filename: string
  size: number
  file_type: string
  description: string
}

export async function getSamples(): Promise<{ samples: SampleInfo[] }> {
  const res = await fetch(`${BASE}/sample`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function uploadSample(name: string = 'cridex.vmem'): Promise<UploadResponse> {
  const res = await fetch(`${BASE}/upload-sample?name=${encodeURIComponent(name)}`, { method: 'POST' })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getJob(jobId: string): Promise<Job> {
  const res = await fetch(`${BASE}/jobs/${jobId}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function getReportUrl(jobId: string): string {
  return `${BASE}/jobs/${jobId}/report`
}

export function getReportPreviewUrl(jobId: string): string {
  return `${BASE}/jobs/${jobId}/report/preview`
}

export async function getAiMode(): Promise<{ mode: string }> {
  const res = await fetch(`${BASE}/ai-mode`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function setAiMode(mode: 'claude' | 'ollama'): Promise<{ mode: string }> {
  const res = await fetch(`${BASE}/ai-mode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
