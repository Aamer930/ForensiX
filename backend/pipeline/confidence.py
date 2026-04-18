import re
from models import Finding, ToolOutput

_RFC1918 = re.compile(
    r"^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)"
)


def score_findings(findings: list[Finding], tool_outputs: list[ToolOutput]) -> list[Finding]:
    """Apply rule-based confidence overrides to LLM-generated findings."""
    yara_matches = _get_yara_matches(tool_outputs)
    net_connections = _get_external_connections(tool_outputs)
    suspicious_procs = _get_suspicious_processes(tool_outputs)

    scored = []
    for f in findings:
        conf = f.confidence  # start with LLM's estimate
        src = f.source.lower()

        if src == "yara" and yara_matches:
            conf = max(conf, 90)
        elif src == "vol_netscan" and net_connections:
            conf = max(conf, 80)
        elif "process" in f.finding.lower() and suspicious_procs:
            conf = max(conf, 75)
        elif src == "strings":
            conf = max(conf, 60)
        elif conf == 0:
            conf = 40

        scored.append(Finding(finding=f.finding, source=f.source, confidence=min(conf, 95)))
    return scored


def _get_yara_matches(outputs: list[ToolOutput]) -> list:
    for o in outputs:
        if o.tool == "yara" and o.success:
            return o.data.get("matches", [])
    return []


def _get_external_connections(outputs: list[ToolOutput]) -> list:
    for o in outputs:
        if o.tool == "vol_netscan" and o.success:
            return [
                c for c in o.data.get("connections", [])
                if c.get("remote") and not _RFC1918.match(c["remote"].split(":")[0])
                and not c["remote"].startswith("0.0.0.0")
            ]
    return []


def _get_suspicious_processes(outputs: list[ToolOutput]) -> list:
    _SUSPICIOUS = {"cmd.exe", "powershell.exe", "wscript.exe", "cscript.exe", "mshta.exe", "regsvr32.exe"}
    for o in outputs:
        if o.tool == "vol_pslist" and o.success:
            return [p for p in o.data.get("processes", []) if str(p.get("name", "")).lower() in _SUSPICIOUS]
    return []
