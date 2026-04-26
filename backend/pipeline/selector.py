import json
import logging
import re
from models import FileType, ToolOutput
from pipeline import llm_client

logger = logging.getLogger(__name__)

_SYSTEM_TEMPLATE = """You are an autonomous forensic agent. Decide the NEXT SINGLE tool to run.

FILE TYPE: {file_type}
VALID TOOLS FOR THIS FILE TYPE: {valid_tools}
TOOLS ALREADY RUN: {tools_run}

Rules:
- Return ONLY valid JSON — no markdown, no explanation, no trailing commas.
- ONLY use tools from VALID TOOLS FOR THIS FILE TYPE — never pick anything else.
- Do not re-run a tool that is already in TOOLS ALREADY RUN.
- If enough evidence exists, return "DONE".

Schema: {{"next_tool": "<tool_or_DONE>", "reasoning": "<one sentence why>"}}"""

_VALID_TOOLS_BY_TYPE = {
    "memory_dump":     ["strings", "yara", "volatility3"],
    "pe_executable":   ["strings", "yara", "binwalk"],
    "log_file":        ["strings", "yara"],
    "disk_image":      ["strings", "yara", "binwalk"],
    "pcap_capture":    ["pcap", "strings", "yara"],
    "windows_eventlog":["evtx", "strings", "yara"],
    "unknown":         ["strings", "yara"],
}

def get_next_tool(file_type: FileType, tool_outputs: list[ToolOutput]) -> dict:
    run_tools = [o.tool for o in tool_outputs]
    run_base = set()
    for t in run_tools:
        run_base.add("volatility3" if t.startswith("vol_") else t)

    valid_for_type = _VALID_TOOLS_BY_TYPE.get(file_type.value, ["strings", "yara"])
    # Remove already-run tools from valid set
    remaining = [t for t in valid_for_type if t not in run_base]
    if not remaining:
        return {"next_tool": "DONE", "reasoning": "All valid tools for this file type have been run."}

    summarized_findings = []
    for o in tool_outputs:
        if o.success:
            summarized_findings.append(f"[{o.tool}] Success. Summary: {str(o.data)[:300]}")
        else:
            summarized_findings.append(f"[{o.tool}] Failed: {o.error}")
    findings_text = "\n".join(summarized_findings) if summarized_findings else "(no tools run yet)"

    system = _SYSTEM_TEMPLATE.format(
        file_type=file_type.value,
        valid_tools=remaining,
        tools_run=list(run_base),
    )
    user_msg = f"findings_so_far:\n{findings_text}\n\nChoose the next tool from {remaining}."

    valid_set = set(remaining) | {"DONE"}

    for attempt in range(3):
        try:
            text = llm_client.call(system, user_msg, max_tokens=200)
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]
            text = text.strip()
            match = re.search(r'\{[^{}]*\}', text)
            if match:
                text = match.group(0)
            text = re.sub(r',\s*([}\]])', r'\1', text)
            data = json.loads(text)
            next_tool = data.get("next_tool", "").strip()
            if next_tool in valid_set:
                logger.info("[selector] chose %s for %s", next_tool, file_type.value)
                return data
            # LLM picked something outside valid set — go to fallback immediately
            logger.warning("[selector] LLM chose %s (not in %s), using fallback", next_tool, remaining)
            break
        except Exception as e:
            logger.warning("[selector] attempt %d failed: %s", attempt + 1, e)
            continue

    # Deterministic fallback
    for tool in valid_for_type:
        if tool not in run_base:
            return {"next_tool": tool, "reasoning": f"Deterministic fallback: running {tool}."}
    return {"next_tool": "DONE", "reasoning": "Deterministic fallback: all tools done."}
