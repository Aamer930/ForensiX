import uuid
import asyncio
import aiofiles
import os
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from models import Job, JobStatus, UploadResponse
from job_store import create_job, update_job, emit
from pipeline.router import detect_file_type
from models import FileType, WSEvent

router = APIRouter()

UPLOAD_DIR = "/tmp/forensix_uploads"
MAX_SIZE_BYTES = 500 * 1024 * 1024  # 500MB
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", response_model=UploadResponse)
async def upload_artifact(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    job_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{job_id}_{file.filename}")

    # Stream to disk with size limit
    size = 0
    async with aiofiles.open(file_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_SIZE_BYTES:
                os.remove(file_path)
                raise HTTPException(413, "File exceeds 500MB limit")
            await f.write(chunk)

    file_type = detect_file_type(file_path)
    job = Job(
        job_id=job_id,
        filename=file.filename,
        file_type=file_type,
        file_path=file_path,
        status=JobStatus.pending,
    )
    create_job(job)

    # Trigger pipeline in background
    background_tasks.add_task(run_pipeline, job_id)

    return UploadResponse(job_id=job_id, filename=file.filename, file_type=file_type.value)


@router.get("/sample")
async def get_sample_info():
    """Returns info about the bundled demo sample."""
    sample_path = "/app/sample/cridex.vmem"
    if not os.path.exists(sample_path):
        raise HTTPException(404, "Sample artifact not available")
    size = os.path.getsize(sample_path)
    return {"filename": "cridex.vmem", "size": size, "file_type": "memory_dump"}


@router.post("/upload-sample", response_model=UploadResponse)
async def upload_sample(background_tasks: BackgroundTasks):
    """Triggers analysis on the bundled cridex.vmem sample."""
    sample_path = "/app/sample/cridex.vmem"
    if not os.path.exists(sample_path):
        raise HTTPException(404, "Sample artifact not available")

    job_id = str(uuid.uuid4())
    import shutil
    dest = os.path.join(UPLOAD_DIR, f"{job_id}_cridex.vmem")
    shutil.copy2(sample_path, dest)

    file_type = FileType.memory_dump
    job = Job(
        job_id=job_id,
        filename="cridex.vmem",
        file_type=file_type,
        file_path=dest,
        status=JobStatus.pending,
    )
    create_job(job)
    background_tasks.add_task(run_pipeline, job_id)
    return UploadResponse(job_id=job_id, filename="cridex.vmem", file_type=file_type.value)


async def run_pipeline(job_id: str):
    """Background task: runs the full forensic pipeline."""
    from pipeline.executor import execute_pipeline
    await execute_pipeline(job_id)
