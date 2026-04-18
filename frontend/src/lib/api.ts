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
  timeline: { time: string; event: string }[]
  hypothesis: string
  evidence: { finding: string; source: string; confidence: number }[]
  summary: string
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

export async function uploadSample(): Promise<UploadResponse> {
  const res = await fetch(`${BASE}/upload-sample`, { method: 'POST' })
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
