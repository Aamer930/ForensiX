import asyncio
import os
from models import JobStatus, WSEvent, FileType
from job_store import get_job, update_job, emit
from pipeline.selector import select_tools
from pipeline.correlator import correlate
from pipeline.confidence import score_findings
from pipeline.llm_client import active_mode


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

        await emit(job_id, WSEvent(type="llm_thinking", message=f"File identified as {job.file_type.value}. Using {active_mode()} to select tools..."))

        # Step 2: Quick strings sample for tool selection
        strings_sample = await _run_in_thread(_quick_strings, job.file_path)

        # Step 3: Tool selection via Claude
        selected_tools = await _run_in_thread(select_tools, job.file_type, strings_sample)
        await emit(job_id, WSEvent(
            type="llm_thinking",
            message=f"AI selected tools: {', '.join(selected_tools)}",
            data={"tools": selected_tools}
        ))

        # Step 4: Execute tools
        all_outputs = []
        for tool_name in selected_tools:
            await emit(job_id, WSEvent(type="step_start", tool=tool_name, message=f"Running {tool_name}..."))
            outputs = await _run_in_thread(_execute_tool, tool_name, job.file_path)

            if not isinstance(outputs, list):
                outputs = [outputs]

            for output in outputs:
                if output.success:
                    summary = _summarize_output(output)
                    await emit(job_id, WSEvent(type="step_done", tool=output.tool, message=summary))
                else:
                    await emit(job_id, WSEvent(type="step_error", tool=output.tool, message=f"{output.tool} failed: {output.error}"))
                all_outputs.append(output)

        job.tool_outputs = all_outputs
        update_job(job)

        # Step 5: Correlation via Claude
        await emit(job_id, WSEvent(type="llm_thinking", message="Correlating findings and generating incident report..."))
        correlation = await _run_in_thread(correlate, all_outputs)

        # Step 6: Confidence scoring
        correlation.evidence = score_findings(correlation.evidence, all_outputs)

        job.correlation = correlation
        job.status = JobStatus.complete
        update_job(job)

        # Clean up uploaded file to save disk space
        _cleanup_file(job.file_path)

        await emit(job_id, WSEvent(
            type="complete",
            message="Analysis complete.",
            data={"job_id": job_id}
        ))

    except Exception as e:
        job.status = JobStatus.failed
        job.error = str(e)
        update_job(job)
        _cleanup_file(job.file_path)
        await emit(job_id, WSEvent(type="error", message=f"Pipeline failed: {str(e)}"))


async def _run_in_thread(fn, *args):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, fn, *args)


def _quick_strings(file_path: str) -> list[str]:
    """Fast strings extract for tool selection input (first 50 only)."""
    from tools.strings_tool import run_strings
    output = run_strings(file_path)
    return output.data.get("strings", [])[:50] if output.success else []


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
        return f"Extracted {len(d.get('strings', []))} strings (from {d.get('total_raw', 0)} raw)"
    if output.tool == "yara":
        n = d.get("total", 0)
        return f"YARA: {n} rule match{'es' if n != 1 else ''} found"
    if output.tool == "vol_pslist":
        return f"Found {len(d.get('processes', []))} processes"
    if output.tool == "vol_netscan":
        return f"Found {len(d.get('connections', []))} network connections"
    if output.tool == "vol_cmdline":
        return f"Captured {len(d.get('cmdlines', []))} command lines"
    if output.tool == "vol_imageinfo":
        banners = d.get("banners", [])
        return f"Image info: {banners[0][:80] if banners else 'No banner detected'}"
    if output.tool == "binwalk":
        return f"binwalk: {len(d.get('carved', []))} embedded files identified"
    return f"{output.tool} completed"


def _cleanup_file(file_path: str) -> None:
    try:
        if file_path and os.path.exists(file_path):
            # Don't delete the bundled sample
            if "cridex.vmem" not in file_path or "/tmp/" in file_path:
                os.remove(file_path)
    except Exception:
        pass
