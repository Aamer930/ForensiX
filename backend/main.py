from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel as PydanticBaseModel
import os
import logging
import traceback

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("forensix")

from routers import upload, ws
from job_store import get_job, update_job
from models import JobStatus
from report.pdf_builder import build_pdf
from pipeline.health import check_ai_backend
from pipeline import llm_client
import db

app = FastAPI(title="ForensiX", version="1.0.0")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    logger.error("Unhandled exception on %s %s\n%s", request.method, request.url.path, tb)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {type(exc).__name__}: {exc}"},
    )


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
    logger.info("="*50)
    logger.info("  ForensiX — Autonomous Forensic Agent v1.0")
    logger.info("="*50)
    db.init_db()
    check_ai_backend()
    logger.info("Startup complete")

@app.get("/api/history")
async def get_history():
    return db.get_all_cases()


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
        "agent_reasoning": [r.model_dump() for r in job.agent_reasoning],
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


class RecorrelateRequest(PydanticBaseModel):
    timeline: list[dict]


@app.post("/api/jobs/{job_id}/recorrelate")
async def recorrelate_job(job_id: str, body: RecorrelateRequest):
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job.status != JobStatus.complete:
        raise HTTPException(400, "Job not complete yet")

    from pipeline.correlator import recorrelate_with_timeline
    from pipeline.confidence import score_findings
    from models import TimelineEvent

    edited_timeline = [TimelineEvent(**ev) for ev in body.timeline]
    new_correlation = recorrelate_with_timeline(job.tool_outputs, edited_timeline)
    new_correlation.evidence = score_findings(new_correlation.evidence, job.tool_outputs)
    job.correlation = new_correlation
    update_job(job)
    return {"status": "ok", "correlation": new_correlation.model_dump()}


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
