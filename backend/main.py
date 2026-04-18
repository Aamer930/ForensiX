from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
import os

from routers import upload, ws
from job_store import get_job
from models import JobStatus
from report.pdf_builder import build_pdf

app = FastAPI(title="ForensiX", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api")
app.include_router(ws.router)


@app.get("/api/jobs/{job_id}")
async def get_job_status(job_id: str):
    job = get_job(job_id)
    if not job:
        from fastapi import HTTPException
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
    from fastapi import HTTPException
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job.status != JobStatus.complete:
        raise HTTPException(400, "Analysis not complete")

    pdf_bytes = build_pdf(job)

    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="forensix_{job_id[:8]}.pdf"'},
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
