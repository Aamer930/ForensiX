import asyncio
import os
from models import JobStatus, WSEvent, FileType
from job_store import get_job, update_job, emit
from pipeline.selector import get_next_tool
from pipeline.correlator import correlate
from pipeline.confidence import score_findings
from pipeline.llm_client import active_mode
import db


async def execute_pipeline(job_id: str):
    job = get_job(job_id)
    if not job:
        return

    job.status = JobStatus.running
    update_job(job)

    try:
        # Step 1: File type check
        if job.file_type == FileType.unknown:
            await emit(job_id, WSEvent(type="error", message="Unsupported file type. Cannot analyze."))
            job.status = JobStatus.failed
            job.error = "Unsupported file type"
            update_job(job)
            return

        await emit(job_id, WSEvent(type="llm_thinking", message=f"File identified as {job.file_type.value}. Starting autonomous agent loop with {active_mode()}..."))

        # Step 2: Mandatory tools first (strings + yara always run)
        all_outputs = []
        tools_run = set()
        
        mandatory_tools = ["strings", "yara"]
        for tool in mandatory_tools:
            await emit(job_id, WSEvent(type="llm_thinking", message=f"Agent reasoning: {tool} is a mandatory forensic step — must always run to extract baseline indicators."))
            await emit(job_id, WSEvent(type="step_start", tool=tool, message=f"Running {tool}..."))
            outputs = await _run_in_thread(_execute_tool, tool, job.file_path)
            if not isinstance(outputs, list):
                outputs = [outputs]
            for output in outputs:
                if output.success:
                    summary = _summarize_output(output)
                    await emit(job_id, WSEvent(type="step_done", tool=output.tool, message=summary))
                else:
                    await emit(job_id, WSEvent(type="step_error", tool=output.tool, message=f"{output.tool} failed: {output.error}"))
                all_outputs.append(output)
            tools_run.add(tool)

        # Step 2b: Agent decides remaining tools (volatility3, binwalk)
        max_agent_steps = 3
        for _ in range(max_agent_steps):
            agent_decision = await _run_in_thread(get_next_tool, job.file_type, all_outputs)
            next_tool = agent_decision.get("next_tool")
            reasoning = agent_decision.get("reasoning", "Deciding next step...")

            if next_tool == "DONE":
                await emit(job_id, WSEvent(type="llm_thinking", message=f"Agent conclusion: {reasoning}"))
                break

            if next_tool not in ["strings", "yara", "volatility3", "binwalk"]:
                break
                
            if next_tool in tools_run:
                break
            
            await emit(job_id, WSEvent(type="llm_thinking", message=f"Agent reasoning: {reasoning}"))
            await emit(job_id, WSEvent(type="step_start", tool=next_tool, message=f"Running {next_tool}..."))
            
            outputs = await _run_in_thread(_execute_tool, next_tool, job.file_path)
            
            if not isinstance(outputs, list):
                outputs = [outputs]
                
            for output in outputs:
                if output.success:
                    summary = _summarize_output(output)
                    await emit(job_id, WSEvent(type="step_done", tool=output.tool, message=summary))
                else:
                    await emit(job_id, WSEvent(type="step_error", tool=output.tool, message=f"{output.tool} failed: {output.error}"))
                all_outputs.append(output)
            
            tools_run.add(next_tool)

        job.tool_outputs = all_outputs
        update_job(job)

        # Step 3: Correlation via Claude
        await emit(job_id, WSEvent(type="llm_thinking", message="Correlating findings and generating incident report..."))
        correlation = await _run_in_thread(correlate, all_outputs)

        # Step 4: Confidence scoring & Threat Intelligence (VirusTotal)
        correlation.evidence = score_findings(correlation.evidence, all_outputs)
        
        await emit(job_id, WSEvent(type="llm_thinking", message="Checking indicators against VirusTotal Threat Intelligence API..."))
        from pipeline.vt_client import check_indicator
        for s in correlation.suspicious_strings:
            vt_res = await _run_in_thread(check_indicator, s.value)
            if vt_res["malicious"] > 0:
                s.reason += f" [VirusTotal: {vt_res['malicious']}/{vt_res['total']} engines detected this as malicious. Vendors: {', '.join(vt_res['vendors'])}]"
                s.severity = "critical"

        job.correlation = correlation
        
        # Clean up uploaded file
        _cleanup_file(job.file_path)
        await emit(job.job_id, WSEvent(type="terminal", message="[ AI ] Finished producing forensic report.", tool="correlator"))

        job.status = JobStatus.complete
        update_job(job)
        db.save_case(job)

        await emit(job.job_id, WSEvent(type="complete", message="Analysis complete."))

    except Exception as e:
        job.status = JobStatus.failed
        job.error = str(e)
        update_job(job)
        db.save_case(job)
        await emit(job.job_id, WSEvent(type="error", message=f"Analysis failed: {e}"))


async def _run_in_thread(fn, *args):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, fn, *args)


def _execute_tool(tool_name: str, file_path: str):
    if tool_name == "strings":
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
    else:
        from models import ToolOutput
        return ToolOutput(tool=tool_name, success=False, data={}, error="Unknown tool")


def _summarize_output(output) -> str:
    d = output.data
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
    return f"{output.tool} completed"


def _cleanup_file(file_path: str) -> None:
    try:
        if file_path and os.path.exists(file_path):
            if "cridex.vmem" not in file_path or "/tmp/" in file_path:
                os.remove(file_path)
    except Exception:
        pass
