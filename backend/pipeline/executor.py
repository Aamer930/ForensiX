import asyncio
import logging
import os
import traceback
from models import JobStatus, WSEvent, FileType, AgentReasoningStep
from job_store import get_job, update_job, emit
from pipeline.selector import get_next_tool
from pipeline.correlator import correlate
from pipeline.confidence import score_findings
from pipeline.llm_client import active_mode
import db

logger = logging.getLogger(__name__)

MAX_AGENT_STEPS = 9   # entropy (mandatory) + up to 9 agent decisions = max 10 LLM calls


async def execute_pipeline(job_id: str):
    job = get_job(job_id)
    if not job:
        return

    job.status = JobStatus.running
    update_job(job)

    try:
        if job.file_type == FileType.unknown:
            await emit(job_id, WSEvent(type="error", message="Unsupported file type. Cannot analyze."))
            job.status = JobStatus.failed
            job.error = "Unsupported file type"
            update_job(job)
            return

        await emit(job_id, WSEvent(
            type="llm_thinking",
            message=f"File identified as {job.file_type.value}. Starting iterative agent loop with {active_mode()}..."
        ))

        all_outputs = []
        tools_run = set()

        # Mandatory first tool: pcap for captures, evtx for Windows event logs, entropy for everything else
        first_tool = (
            "pcap" if job.file_type == FileType.pcap_capture
            else "evtx" if job.file_type == FileType.windows_eventlog
            else "entropy"
        )
        if first_tool == "pcap":
            first_reason = "PCAP capture detected. Network traffic analysis reveals DNS, HTTP, and IP communication patterns."
            first_msg = "Analyzing network traffic..."
        elif first_tool == "evtx":
            first_reason = "Windows Event Log detected. Parsing high-signal Event IDs (4688, 4624, 7045, etc.) for process creation, logon events, and persistence indicators."
            first_msg = "Parsing Windows Event Log..."
        else:
            first_reason = "Entropy analysis is always the first step — reveals packing, encryption, and compression before any other tool runs."
            first_msg = "Running entropy analysis..."

        logger.info("[%s] Starting pipeline — file_type=%s first_tool=%s", job_id[:8], job.file_type, first_tool)
        await _emit_reason(job_id, job, step=0, chosen_tool=first_tool, reasoning=first_reason, findings="No prior findings.")
        await emit(job_id, WSEvent(type="step_start", tool=first_tool, message=first_msg))
        outputs = await _run_in_thread(_execute_tool, first_tool, job.file_path)
        outputs = outputs if isinstance(outputs, list) else [outputs]
        for output in outputs:
            if output.success:
                logger.info("[%s] Tool %s succeeded", job_id[:8], output.tool)
                await emit(job_id, WSEvent(type="step_done", tool=output.tool, message=_summarize_output(output)))
            else:
                logger.warning("[%s] Tool %s failed: %s", job_id[:8], output.tool, output.error)
                await emit(job_id, WSEvent(type="step_error", tool=output.tool, message=f"{output.tool} failed: {output.error}"))
            all_outputs.append(output)
        tools_run.add(first_tool)

        # Iterative agent loop — agent decides every subsequent tool
        for step in range(1, MAX_AGENT_STEPS + 1):
            findings_summary = _build_findings_summary(all_outputs)
            agent_decision = await _run_in_thread(get_next_tool, job.file_type, all_outputs)
            next_tool = agent_decision.get("next_tool", "DONE")
            reasoning = agent_decision.get("reasoning", "No reasoning provided.")

            await _emit_reason(job_id, job, step=step, chosen_tool=next_tool,
                               reasoning=reasoning, findings=findings_summary)

            if next_tool == "DONE":
                await emit(job_id, WSEvent(type="llm_thinking", message=f"Agent concluded: {reasoning}"))
                break

            if next_tool not in {"strings", "yara", "volatility3", "binwalk", "pcap", "evtx"}:
                break

            base_tool = "volatility3" if next_tool.startswith("vol_") else next_tool
            if base_tool in tools_run:
                await emit(job_id, WSEvent(type="llm_thinking", message=f"Agent wanted {next_tool} but already ran — concluding."))
                break

            await emit(job_id, WSEvent(type="step_start", tool=next_tool, message=f"Running {next_tool}..."))
            outputs = await _run_in_thread(_execute_tool, next_tool, job.file_path)
            outputs = outputs if isinstance(outputs, list) else [outputs]
            for output in outputs:
                if output.success:
                    await emit(job_id, WSEvent(type="step_done", tool=output.tool, message=_summarize_output(output)))
                else:
                    await emit(job_id, WSEvent(type="step_error", tool=output.tool, message=f"{output.tool} failed: {output.error}"))
                all_outputs.append(output)
            tools_run.add(base_tool)

        job.tool_outputs = all_outputs
        update_job(job)

        # Correlation
        await emit(job_id, WSEvent(type="llm_thinking", message="Correlating all findings — generating multi-hypothesis incident report..."))
        correlation = await _run_in_thread(correlate, all_outputs)

        # Confidence scoring
        correlation.evidence = score_findings(correlation.evidence, all_outputs)

        # VirusTotal enrichment
        await emit(job_id, WSEvent(type="llm_thinking", message="Checking indicators against VirusTotal Threat Intelligence API..."))
        from pipeline.vt_client import check_indicator
        for s in correlation.suspicious_strings:
            vt_res = await _run_in_thread(check_indicator, s.value)
            if vt_res["malicious"] > 0:
                s.reason += f" [VirusTotal: {vt_res['malicious']}/{vt_res['total']} engines detected this as malicious. Vendors: {', '.join(vt_res['vendors'])}]"
                s.severity = "critical"

        # Adversary profiling
        from pipeline.adversary import profile_adversary
        adversary = profile_adversary(correlation)
        if adversary:
            correlation.adversary = adversary
            await emit(job_id, WSEvent(
                type="llm_thinking",
                message=f"Adversary profiling: tactics match {adversary.name} ({adversary.confidence}% confidence)"
            ))

        job.correlation = correlation
        _cleanup_file(job.file_path)

        await emit(job.job_id, WSEvent(type="terminal", message="[ AI ] Finished producing forensic report.", tool="correlator"))
        job.status = JobStatus.complete
        update_job(job)
        db.save_case(job)
        await emit(job.job_id, WSEvent(type="complete", message="Analysis complete."))

    except Exception as e:
        logger.error("Pipeline failed for job %s: %s\n%s", job_id, e, traceback.format_exc())
        job.status = JobStatus.failed
        job.error = str(e)
        update_job(job)
        db.save_case(job)
        await emit(job.job_id, WSEvent(type="error", message=f"Analysis failed: {e}"))


async def _emit_reason(job_id: str, job, step: int, chosen_tool: str, reasoning: str, findings: str):
    step_obj = AgentReasoningStep(
        step=step,
        chosen_tool=chosen_tool,
        reasoning=reasoning,
        findings_so_far=findings,
    )
    job.agent_reasoning.append(step_obj)
    update_job(job)
    await emit(job_id, WSEvent(
        type="llm_reason",
        tool=chosen_tool,
        message=f"Step {step}: chose [{chosen_tool}] — {reasoning}",
        data={"step": step, "chosen_tool": chosen_tool, "reasoning": reasoning, "findings_so_far": findings},
    ))


def _build_findings_summary(outputs) -> str:
    parts = []
    for o in outputs:
        if o.success:
            parts.append(f"{o.tool}: {_summarize_output(o)}")
        else:
            parts.append(f"{o.tool}: failed")
    return " | ".join(parts) if parts else "No findings yet."


async def _run_in_thread(fn, *args):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, fn, *args)


def _execute_tool(tool_name: str, file_path: str):
    if tool_name == "entropy":
        from tools.entropy_tool import run_entropy
        return run_entropy(file_path)
    elif tool_name == "strings":
        from tools.strings_tool import run_strings
        return run_strings(file_path)
    elif tool_name == "yara":
        from tools.yara_tool import run_yara
        return run_yara(file_path)
    elif tool_name == "volatility3":
        from tools.volatility_tool import run_volatility_full
        return run_volatility_full(file_path)
    elif tool_name == "binwalk":
        from tools.binwalk_tool import run_binwalk
        return run_binwalk(file_path)
    elif tool_name == "pcap":
        from tools.pcap_tool import run_pcap
        return run_pcap(file_path)
    elif tool_name == "evtx":
        from tools.evtx_tool import run_evtx
        return run_evtx(file_path)
    else:
        from models import ToolOutput
        return ToolOutput(tool=tool_name, success=False, data={}, error="Unknown tool")


def _summarize_output(output) -> str:
    d = output.data
    if output.tool == "entropy":
        ov = d.get("overall_entropy", 0)
        cls = d.get("classification", "unknown")
        hr = d.get("high_entropy_regions", 0)
        packed = " ⚠ PACKED/ENCRYPTED" if cls in ("packed", "encrypted") else ""
        return f"Entropy: {ov}/8.0 ({cls}), {hr} high-entropy region(s){packed}"
    if output.tool == "strings":
        ascii_n = d.get("ascii_count", 0)
        unicode_n = d.get("unicode_count", 0)
        return f"Extracted {len(d.get('strings', []))} suspicious strings ({ascii_n} ASCII + {unicode_n} Unicode from {d.get('total_raw', 0)} total)"
    if output.tool == "yara":
        n = d.get("total", 0)
        if n > 0:
            names = [m.get("rule", "?") for m in d.get("matches", [])[:3]]
            return f"YARA: {n} match{'es' if n != 1 else ''} — {', '.join(names)}"
        return "YARA: No signature matches"
    if output.tool == "vol_pslist":
        return f"Found {len(d.get('processes', []))} processes in memory"
    if output.tool == "vol_netscan":
        return f"Found {len(d.get('connections', []))} network connections"
    if output.tool == "vol_cmdline":
        return f"Captured {len(d.get('cmdlines', []))} command lines"
    if output.tool == "vol_imageinfo":
        banners = d.get("banners", [])
        return f"Image info: {banners[0][:80] if banners else 'No banner detected'}"
    if output.tool == "binwalk":
        ent = d.get("entropy", {})
        packed = " [PACKED/ENCRYPTED]" if ent.get("packed") else ""
        return f"binwalk: {len(d.get('carved', []))} embedded files, entropy={ent.get('avg_entropy', '?')}{packed}"
    if output.tool == "pcap":
        dns_n = d.get("dns_count", 0)
        http_n = d.get("http_count", 0)
        ips_n = d.get("unique_ips", 0)
        return f"PCAP: {dns_n} DNS queries, {http_n} HTTP requests, {ips_n} unique IPs"
    if output.tool == "evtx":
        n = d.get("event_count", 0)
        total = d.get("total_records_scanned", 0)
        return f"EVTX: {n} high-signal events from {total} total records"
    return f"{output.tool} completed"


def _cleanup_file(file_path: str) -> None:
    try:
        if file_path and os.path.exists(file_path):
            if "cridex.vmem" not in file_path or "/tmp/" in file_path:
                os.remove(file_path)
    except Exception:
        pass
