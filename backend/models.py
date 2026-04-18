from pydantic import BaseModel
from typing import Any, Optional
from enum import Enum


class JobStatus(str, Enum):
    pending = "pending"
    running = "running"
    complete = "complete"
    failed = "failed"


class FileType(str, Enum):
    memory_dump = "memory_dump"
    pe_executable = "pe_executable"
    log_file = "log_file"
    disk_image = "disk_image"
    unknown = "unknown"


class ToolOutput(BaseModel):
    tool: str
    success: bool
    data: dict[str, Any]
    error: Optional[str] = None


class Finding(BaseModel):
    finding: str
    source: str
    confidence: int  # 0-100


class TimelineEvent(BaseModel):
    time: str
    event: str


class CorrelationResult(BaseModel):
    timeline: list[TimelineEvent]
    hypothesis: str
    evidence: list[Finding]
    summary: str


class Job(BaseModel):
    job_id: str
    status: JobStatus = JobStatus.pending
    filename: str
    file_type: Optional[FileType] = None
    file_path: str
    tool_outputs: list[ToolOutput] = []
    correlation: Optional[CorrelationResult] = None
    ws_events: list[dict] = []  # buffered for reconnect replay
    error: Optional[str] = None


class UploadResponse(BaseModel):
    job_id: str
    filename: str
    file_type: str


class WSEvent(BaseModel):
    type: str  # step_start | step_done | step_error | llm_thinking | complete | error
    tool: Optional[str] = None
    message: str
    data: Optional[dict] = None
