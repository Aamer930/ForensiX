import asyncio
from typing import Optional
from models import Job, WSEvent

_jobs: dict[str, Job] = {}
# Map job_id -> list of active WebSocket send callbacks
_ws_connections: dict[str, list] = {}


def create_job(job: Job) -> Job:
    _jobs[job.job_id] = job
    _ws_connections[job.job_id] = []
    return job


def get_job(job_id: str) -> Optional[Job]:
    return _jobs.get(job_id)


def update_job(job: Job) -> None:
    _jobs[job.job_id] = job


def register_ws(job_id: str, send_fn) -> None:
    if job_id not in _ws_connections:
        _ws_connections[job_id] = []
    _ws_connections[job_id].append(send_fn)


def unregister_ws(job_id: str, send_fn) -> None:
    if job_id in _ws_connections:
        _ws_connections[job_id] = [f for f in _ws_connections[job_id] if f != send_fn]


async def emit(job_id: str, event: WSEvent) -> None:
    job = _jobs.get(job_id)
    if job:
        job.ws_events.append(event.model_dump())

    event_dict = event.model_dump()
    fns = list(_ws_connections.get(job_id, []))
    for send_fn in fns:
        try:
            await send_fn(event_dict)
        except Exception:
            pass
