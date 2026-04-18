from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import os

from routers import upload, ws
from job_store import get_job
from models import JobStatus
from report.pdf_builder import build_pdf
from pipeline.health import check_ai_backend
from pipeline import llm_client

app = FastAPI(title="ForensiX", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api")
app.include_router(ws.router)


@app.on_event("startup")
async def startup():
    print("\n" + "="*50)
    print("  ForensiX — Autonomous Forensic Agent v1.0")
    print("="*50)
    check_ai_backend()
    print("="*50 + "\n")


@app.get("/api/jobs/{job_id}")
async def get_job_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return {
        "job_id": job.job_id,
        "status": job.status,
        "filename": job.filename,
        "file_type": job.file_type,
        "correlation": job.correlation.model_dump() if job.correlation else None,
        "tool_outputs": [t.model_dump() for t in job.tool_outputs],
        "error": job.error,
    }


@app.get("/api/jobs/{job_id}/report")
async def download_report(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job.status != JobStatus.complete:
        raise HTTPException(400, "Analysis not complete")

    pdf_bytes = build_pdf(job, ai_mode=llm_client.get_mode())
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="forensix_{job_id[:8]}.pdf"'},
    )


@app.get("/api/jobs/{job_id}/report/preview")
async def preview_report(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job.status != JobStatus.complete:
        raise HTTPException(400, "Analysis not complete")

    pdf_bytes = build_pdf(job, ai_mode=llm_client.get_mode())
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="forensix_{job_id[:8]}.pdf"'},
    )


@app.get("/health")
async def health():
    return {"status": "ok", "ai_mode": llm_client.get_mode()}


@app.get("/api/ai-mode")
async def get_ai_mode():
    return {"mode": llm_client.get_mode()}


@app.post("/api/ai-mode")
async def set_ai_mode(body: dict):
    mode = body.get("mode", "")
    try:
        llm_client.set_mode(mode)
        return {"mode": llm_client.get_mode()}
    except ValueError as e:
        raise HTTPException(400, str(e))
