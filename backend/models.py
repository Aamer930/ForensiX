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
    pcap_capture = "pcap_capture"
    windows_eventlog = "windows_eventlog"
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
    tool_source: Optional[str] = None  # which tool produced this event


class Hypothesis(BaseModel):
    label: str          # e.g. "Mirai Botnet C2 Implant"
    description: str    # 2-3 sentence explanation
    confidence: int     # 0-100


class AdversaryProfile(BaseModel):
    name: str                    # e.g. "APT28 / Fancy Bear"
    motivation: str              # e.g. "Espionage"
    ttps: list[str]              # matched MITRE techniques
    confidence: int              # 0-100
    notes: str                   # why this actor matches


class CorrelationResult(BaseModel):
    timeline: list[TimelineEvent]
    hypothesis: str
    hypotheses: list[Hypothesis] = []   # 3 ranked attack scenarios
    evidence: list[Finding]
    summary: str
    suspicious_strings: list[SuspiciousString] = []
    risk_score: int = 0
    mitre_tactics: list[str] = []
    adversary: Optional[AdversaryProfile] = None


class AgentReasoningStep(BaseModel):
    step: int
    chosen_tool: str        # tool name or "DONE" or "CORRELATE"
    reasoning: str          # LLM reasoning text
    findings_so_far: str    # brief summary of what was found


class Job(BaseModel):
    job_id: str
    status: JobStatus = JobStatus.pending
    filename: str
    file_type: Optional[FileType] = None
    file_path: str
    tool_outputs: list[ToolOutput] = []
    correlation: Optional[CorrelationResult] = None
    ws_events: list[dict] = []
    error: Optional[str] = None
    agent_reasoning: list[AgentReasoningStep] = []   # all agent decisions


class UploadResponse(BaseModel):
    job_id: str
    filename: str
    file_type: str


class WSEvent(BaseModel):
    type: str  # step_start | step_done | step_error | llm_thinking | llm_reason | complete | error
    tool: Optional[str] = None
    message: str
    data: Optional[dict] = None
