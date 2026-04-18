import json
import re
from models import ToolOutput, CorrelationResult, Finding, TimelineEvent, SuspiciousString
from pipeline import llm_client

_SYSTEM = """You are a senior forensic analyst. Given structured outputs from forensic tools,
produce a JSON incident report. Be precise and evidence-based.
Return ONLY valid JSON — no markdown, no explanation, just the JSON object.
Schema:
{
  "timeline": [{"time": "<timestamp or Unknown>", "event": "<description>"}],
  "hypothesis": "<attack hypothesis, 2-4 sentences>",
  "evidence": [{"finding": "<what was found>", "source": "<tool name>", "confidence": <0-100>}],
  "summary": "<1 paragraph executive summary>",
  "suspicious_strings": [{"value": "<string>", "reason": "<why suspicious, 1-2 sentences>", "severity": "<critical|high|medium|low>"}]
}
For suspicious_strings: pick up to 10 forensically significant strings (IPs, domains, registry keys, commands, malware indicators).
Severity: critical=C2/exploit/rootkit, high=persistence/lateral-movement, medium=recon/staging, low=informational."""


def _cap_output(output: ToolOutput) -> dict:
    if not output.success:
        return {"tool": output.tool, "error": output.error}
    data = output.data
    if output.tool == "strings":
        return {"tool": "strings", "strings": data.get("strings", [])[:80]}
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
    return {"tool": output.tool, "data": str(data)[:300]}


def _parse_response(text: str) -> dict:
    text = text.strip()
    # Strip markdown fences
    if "```" in text:
        parts = text.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            try:
                return json.loads(part)
            except Exception:
                continue
    # Try raw parse
    try:
        return json.loads(text)
    except Exception:
        pass
    # Extract first {...} block
    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        return json.loads(match.group(0))
    raise ValueError(f"No valid JSON found in response ({len(text)} chars)")


def correlate(tool_outputs: list[ToolOutput]) -> CorrelationResult:
    capped = [_cap_output(o) for o in tool_outputs]
    user_msg = json.dumps(capped, indent=2)

    last_err = None
    for attempt in range(2):
        try:
            text = llm_client.call(_SYSTEM, user_msg, max_tokens=3000)
            data = _parse_response(text)
            return CorrelationResult(
                timeline=[TimelineEvent(**e) for e in data.get("timeline", [])],
                hypothesis=data.get("hypothesis", "Unable to determine attack hypothesis."),
                evidence=[Finding(**e) for e in data.get("evidence", [])],
                summary=data.get("summary", ""),
                suspicious_strings=[SuspiciousString(**s) for s in data.get("suspicious_strings", [])],
            )
        except Exception as e:
            last_err = e

    return CorrelationResult(
        timeline=[],
        hypothesis="Analysis could not be completed due to an error.",
        evidence=[],
        summary=f"Error during correlation: {str(last_err)}",
    )
