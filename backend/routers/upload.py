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
    """Returns info about all bundled demo samples."""
    sample_dir = "/app/sample"
    samples = []
    if os.path.isdir(sample_dir):
        for fname in sorted(os.listdir(sample_dir)):
            fpath = os.path.join(sample_dir, fname)
            if os.path.isfile(fpath) and not fname.startswith('.') and fname != "generate_samples.py":
                size = os.path.getsize(fpath)
                file_type = _guess_sample_type(fname)
                samples.append({
                    "filename": fname,
                    "size": size,
                    "file_type": file_type,
                    "description": _sample_description(fname),
                })
    return {"samples": samples}


def _guess_sample_type(filename: str) -> str:
    fn = filename.lower()
    if fn.endswith(".vmem") or fn.endswith(".raw") or fn.endswith(".dmp"):
        return "memory_dump"
    elif fn.endswith(".exe") or fn.endswith(".dll"):
        return "pe_executable"
    elif fn.endswith(".log") or fn.endswith(".txt"):
        return "log_file"
    elif fn.endswith(".iso") or fn.endswith(".img") or fn.endswith(".dd"):
        return "disk_image"
    return "unknown"


def _sample_description(filename: str) -> str:
    descs = {
        "cridex.vmem": "Cridex banking trojan — Windows XP memory dump with active C2 connections",
        "suspicious_trojan.exe": "Multi-stage trojan — PE with C2 callbacks, keylogger, credential harvesting",
        "ransomware_demo.exe": "Ransomware sample — file encryption, shadow deletion, BTC ransom note",
        "auth_log_compromised.log": "Compromised server log — SSH brute-force, reverse shell, data exfiltration",
        "webshell_dropper.exe": "Webshell dropper — PHP shell injection, remote code execution, persistence",
    }
    return descs.get(filename, "Forensic artifact")


@router.post("/upload-sample", response_model=UploadResponse)
async def upload_sample(background_tasks: BackgroundTasks, name: str = "cridex.vmem"):
    """Triggers analysis on a bundled sample by name."""
    sample_path = f"/app/sample/{name}"
    if not os.path.exists(sample_path):
        raise HTTPException(404, f"Sample '{name}' not available")

    job_id = str(uuid.uuid4())
    import shutil
    dest = os.path.join(UPLOAD_DIR, f"{job_id}_{name}")
    shutil.copy2(sample_path, dest)

    file_type_str = _guess_sample_type(name)
    type_map = {
        "memory_dump": FileType.memory_dump,
        "pe_executable": FileType.pe_executable,
        "log_file": FileType.log_file,
        "disk_image": FileType.disk_image,
    }
    file_type = type_map.get(file_type_str, FileType.unknown)
    
    job = Job(
        job_id=job_id,
        filename=name,
        file_type=file_type,
        file_path=dest,
        status=JobStatus.pending,
    )
    create_job(job)
    background_tasks.add_task(run_pipeline, job_id)
    return UploadResponse(job_id=job_id, filename=name, file_type=file_type.value)


async def run_pipeline(job_id: str):
    """Background task: runs the full forensic pipeline."""
    from pipeline.executor import execute_pipeline
    await execute_pipeline(job_id)
