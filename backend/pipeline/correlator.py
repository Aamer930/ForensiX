import json
from models import ToolOutput, CorrelationResult, Finding, TimelineEvent
from pipeline import llm_client

_SYSTEM = """You are a senior forensic analyst. Given structured outputs from forensic tools,
produce a JSON incident report. Be precise and evidence-based.
Return ONLY valid JSON matching this schema exactly:
{
  "timeline": [{"time": "<timestamp or 'Unknown'>", "event": "<description>"}],
  "hypothesis": "<plain English attack hypothesis, 2-4 sentences>",
  "evidence": [{"finding": "<what was found>", "source": "<tool name>", "confidence": <0-100>}],
  "summary": "<1 paragraph executive summary>"
}"""


def _cap_output(output: ToolOutput) -> dict:
    if not output.success:
        return {"tool": output.tool, "error": output.error}
    data = output.data
    if output.tool == "strings":
        return {"tool": "strings", "strings": data.get("strings", [])[:200]}
    if output.tool == "yara":
        return {"tool": "yara", "matches": data.get("matches", [])}
    if output.tool == "vol_pslist":
        return {"tool": "vol_pslist", "processes": data.get("processes", [])[:30]}
    if output.tool == "vol_netscan":
        return {"tool": "vol_netscan", "connections": data.get("connections", [])}
    if output.tool == "vol_cmdline":
        return {"tool": "vol_cmdline", "cmdlines": data.get("cmdlines", [])[:20]}
    if output.tool == "vol_imageinfo":
        return {"tool": "vol_imageinfo", "banners": data.get("banners", [])}
    if output.tool == "binwalk":
        return {"tool": "binwalk", "carved": data.get("carved", [])[:20]}
    return {"tool": output.tool, "data": str(data)[:500]}


def _parse_response(text: str) -> dict:
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


def correlate(tool_outputs: list[ToolOutput]) -> CorrelationResult:
    capped = [_cap_output(o) for o in tool_outputs]
    user_msg = json.dumps(capped, indent=2)

    try:
        text = llm_client.call(_SYSTEM, user_msg, max_tokens=2048)
        data = _parse_response(text)
        return CorrelationResult(
            timeline=[TimelineEvent(**e) for e in data.get("timeline", [])],
            hypothesis=data.get("hypothesis", "Unable to determine attack hypothesis."),
            evidence=[Finding(**e) for e in data.get("evidence", [])],
            summary=data.get("summary", ""),
        )
    except Exception as e:
        return CorrelationResult(
            timeline=[],
            hypothesis="Analysis could not be completed due to an error.",
            evidence=[],
            summary=f"Error during correlation: {str(e)}",
        )
