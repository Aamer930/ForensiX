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
    finding: Optional[str] = "Unknown"
    source: Optional[str] = "Unknown"
    confidence: int = 50

class SuspiciousString(BaseModel):
    value: Optional[str] = "Unknown"
    reason: Optional[str] = "Unknown"
    severity: Optional[str] = "low"

class TimelineEvent(BaseModel):
    time: Optional[str] = "Unknown"
    event: Optional[str] = "Unknown Event"
    mitre_tactic: Optional[str] = None
    mitre_technique: Optional[str] = None


class CorrelationResult(BaseModel):
    timeline: list[TimelineEvent]
    hypothesis: str
    evidence: list[Finding]
    summary: str
    suspicious_strings: list[SuspiciousString] = []
    risk_score: int = 0  # 0-100, computed from evidence severity
    mitre_tactics: list[str] = []  # list of triggered MITRE tactic IDs


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
