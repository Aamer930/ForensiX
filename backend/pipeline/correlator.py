import json
import re
from models import ToolOutput, CorrelationResult, Finding, TimelineEvent, SuspiciousString
from pipeline import llm_client


def _compute_risk_score(
    evidence: list[Finding],
    suspicious_strings: list[SuspiciousString],
    timeline: list[TimelineEvent],
    yara_matches: int = 0,
) -> int:
    """Compute a 0-100 threat risk score from forensic findings."""
    score = 0

    # YARA matches are strong indicators
    score += min(yara_matches * 15, 35)

    # Evidence confidence contributes
    if evidence:
        avg_conf = sum(e.confidence for e in evidence) / len(evidence)
        score += int(avg_conf * 0.2)

    # Suspicious string severity
    for s in suspicious_strings:
        if s.severity == "critical":
            score += 8
        elif s.severity == "high":
            score += 5
        elif s.severity == "medium":
            score += 2

    # Timeline density
    score += min(len(timeline) * 2, 10)

    # Evidence count
    score += min(len(evidence) * 2, 10)

    return min(max(score, 0), 100)


def _extract_mitre_tactics(timeline: list[TimelineEvent]) -> list[str]:
    """Extract unique MITRE tactic names from timeline events."""
    tactics = []
    seen = set()
    for ev in timeline:
        if ev.mitre_tactic and ev.mitre_tactic not in seen:
            seen.add(ev.mitre_tactic)
            tactics.append(ev.mitre_tactic)
    return tactics
_SYSTEM = """You are a senior forensic analyst. Given structured outputs from forensic tools,
produce a JSON incident report. Be precise and evidence-based.
Return ONLY valid JSON — no markdown, no explanation, just the JSON object.
Schema:
{
  "timeline": [{"time": "<timestamp or Unknown>", "event": "<description>", "mitre_tactic": "<e.g. Execution>", "mitre_technique": "<e.g. T1059>"}],
  "hypothesis": "<attack hypothesis, 2-4 sentences>",
  "evidence": [{"finding": "<what was found>", "source": "<tool name>", "confidence": <0-100>}],
  "summary": "<1 paragraph executive summary>",
  "suspicious_strings": [{"value": "<string>", "reason": "<why suspicious>", "severity": "<critical|high|medium|low>"}]
}
Rules:
- For suspicious_strings: pick up to 10 forensically significant strings (IPs, domains, registry keys, commands).
- Severity: critical=C2/exploit/rootkit, high=persistence/lateral-movement, medium=recon/staging, low=informational.
- For timeline events: you MUST include a MITRE ATT&CK tactic and technique ID for EVERY event. Choose the most appropriate one. Do NOT use null.
- You MUST return valid JSON. No trailing commas. Escape quotes in strings with backslash.
- Do NOT wrap the JSON in an array. Return a single JSON object starting with { and ending with }."""


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


def _repair_json(text: str) -> str:
    """Attempt to fix common JSON issues from local LLMs."""
    # Remove control characters
    text = re.sub(r'[\x00-\x1f\x7f]', ' ', text)
    # Remove trailing commas before } or ]
    text = re.sub(r',\s*([}\]])', r'\1', text)
    # Replace single quotes with double quotes (crude but helps)
    # Only if there are no double-quoted strings already
    if text.count("'") > text.count('"'):
        text = text.replace("'", '"')
    return text


def _parse_response(text: str) -> dict:
    text = text.strip()

    def _ensure_dict(obj):
        """Ensure the parsed result is a dict, not a list."""
        if isinstance(obj, list):
            for item in obj:
                if isinstance(item, dict):
                    return item
            return {}
        if isinstance(obj, dict):
            return obj
        return {}

    def _try_parse(s: str) -> dict | None:
        """Try to parse a string as JSON, with repair fallback."""
        s = s.strip()
        if not s:
            return None
        # Direct parse
        try:
            return _ensure_dict(json.loads(s))
        except Exception:
            pass
        # Repaired parse
        try:
            return _ensure_dict(json.loads(_repair_json(s)))
        except Exception:
            pass
        return None

    # Strategy 1: Strip markdown fences
    if "```" in text:
        parts = text.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            result = _try_parse(part)
            if result is not None:
                return result

    # Strategy 2: Raw parse
    result = _try_parse(text)
    if result is not None:
        return result

    # Strategy 3: Extract outermost {...} block using brace matching
    start = text.find('{')
    if start != -1:
        depth = 0
        end = start
        for i in range(start, len(text)):
            if text[i] == '{':
                depth += 1
            elif text[i] == '}':
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
        block = text[start:end]
        result = _try_parse(block)
        if result is not None:
            return result

    raise ValueError(f"No valid JSON found in LLM response ({len(text)} chars). "
                     f"First 200 chars: {text[:200]}")


def _build_deterministic_report(tool_outputs: list[ToolOutput]) -> CorrelationResult:
    """
    Build a rich report entirely from raw tool data — no LLM needed.
    This is the fallback when the local model keeps producing garbage JSON.
    """
    evidence = []
    timeline = []
    suspicious = []
    strings_data = []
    yara_matches = []
    processes = []
    connections = []
    cmdlines = []
    banners = []
    carved = []

    for o in tool_outputs:
        if not o.success:
            evidence.append(Finding(
                finding=f"Tool '{o.tool}' failed: {o.error or 'unknown error'}",
                source=o.tool, confidence=20
            ))
            continue
        d = o.data
        if o.tool == "strings":
            strings_data = d.get("strings", [])
            count = d.get("total_raw", len(strings_data))
            evidence.append(Finding(
                finding=f"Extracted {count} raw strings from binary, filtered to {len(strings_data)} forensically relevant strings",
                source="strings", confidence=75
            ))
            timeline.append(TimelineEvent(
                time="T+0s — Initial Triage",
                event=f"String extraction complete: {count} raw strings identified, {len(strings_data)} flagged as suspicious",
                mitre_tactic="Discovery",
                mitre_technique="T1083"
            ))
        elif o.tool == "yara":
            yara_matches = d.get("matches", [])
            total = d.get("total", len(yara_matches))
            if total > 0:
                rule_names = [m.get("rule", "?") for m in yara_matches[:5]]
                evidence.append(Finding(
                    finding=f"YARA matched {total} signature(s): {', '.join(rule_names)}",
                    source="yara", confidence=90
                ))
                for m in yara_matches[:3]:
                    rule = m.get("rule", "unknown")
                    timeline.append(TimelineEvent(
                        time="T+1s — Signature Scan",
                        event=f"YARA rule '{rule}' matched — known malware signature detected",
                        mitre_tactic="Execution",
                        mitre_technique="T1204"
                    ))
            else:
                evidence.append(Finding(
                    finding="No YARA signatures matched — sample may use novel or polymorphic techniques",
                    source="yara", confidence=40
                ))
                timeline.append(TimelineEvent(
                    time="T+1s — Signature Scan",
                    event="YARA scan completed with no matches — possible zero-day or packed malware",
                    mitre_tactic="Defense Evasion",
                    mitre_technique="T1027"
                ))
        elif o.tool == "vol_pslist":
            processes = d.get("processes", [])
            evidence.append(Finding(
                finding=f"Memory analysis: identified {len(processes)} running processes in memory dump",
                source="volatility3/pslist", confidence=75
            ))
            if processes:
                timeline.append(TimelineEvent(
                    time="T+2s — Memory Analysis",
                    event=f"Process enumeration: {len(processes)} active processes found in memory image",
                    mitre_tactic="Execution",
                    mitre_technique="T1059"
                ))
            else:
                timeline.append(TimelineEvent(
                    time="T+2s — Memory Analysis",
                    event="Process listing returned empty — possible anti-forensics or incompatible memory profile",
                    mitre_tactic="Defense Evasion",
                    mitre_technique="T1070"
                ))
        elif o.tool == "vol_netscan":
            connections = d.get("connections", [])
            evidence.append(Finding(
                finding=f"Network scan: found {len(connections)} network connection(s) in memory",
                source="volatility3/netscan", confidence=80
            ))
            if connections:
                timeline.append(TimelineEvent(
                    time="T+3s — Network Analysis",
                    event=f"Network activity: {len(connections)} active/recent connections detected",
                    mitre_tactic="Command and Control",
                    mitre_technique="T1071"
                ))
            else:
                timeline.append(TimelineEvent(
                    time="T+3s — Network Analysis",
                    event="No network connections found in memory — connections may have been terminated or obfuscated",
                    mitre_tactic="Defense Evasion",
                    mitre_technique="T1070.004"
                ))
        elif o.tool == "vol_cmdline":
            cmdlines = d.get("cmdlines", [])
            if cmdlines:
                evidence.append(Finding(
                    finding=f"Captured {len(cmdlines)} command-line arguments from running processes",
                    source="volatility3/cmdline", confidence=70
                ))
                timeline.append(TimelineEvent(
                    time="T+4s — Command Analysis",
                    event=f"Command-line capture: {len(cmdlines)} process arguments recovered",
                    mitre_tactic="Execution",
                    mitre_technique="T1059.001"
                ))
        elif o.tool == "vol_imageinfo":
            banners = d.get("banners", [])
            if banners:
                evidence.append(Finding(
                    finding=f"Memory image identified: {banners[0][:100]}",
                    source="volatility3/imageinfo", confidence=90
                ))
                timeline.append(TimelineEvent(
                    time="T+0s — Image Identification",
                    event=f"Memory dump profiled: {banners[0][:80]}",
                    mitre_tactic="Discovery",
                    mitre_technique="T1082"
                ))
        elif o.tool == "binwalk":
            carved = d.get("carved", [])
            if carved:
                evidence.append(Finding(
                    finding=f"Binwalk carved {len(carved)} embedded file(s) from binary",
                    source="binwalk", confidence=65
                ))
                timeline.append(TimelineEvent(
                    time="T+5s — Binary Carving",
                    event=f"Embedded content: {len(carved)} files carved from sample (possible payload staging)",
                    mitre_tactic="Defense Evasion",
                    mitre_technique="T1027.002"
                ))

    # Build suspicious strings from raw extracted strings — comprehensive detection
    ip_pattern = re.compile(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}')
    url_pattern = re.compile(r'https?://')
    domain_pattern = re.compile(r'[a-zA-Z0-9][-a-zA-Z0-9]*\.(com|net|org|ru|cn|tk|info|biz|cc|xyz)')
    
    seen_values = set()
    
    for s in strings_data[:500]:
        val = s if isinstance(s, str) else str(s)
        val_lower = val.lower()
        val_clean = val[:120]
        
        if val_clean in seen_values or len(val.strip()) < 3:
            continue
        
        # IP addresses (skip loopback and broadcast)
        if ip_pattern.search(val) and not val.startswith("0.0.") and not val.startswith("127.") and not val.startswith("255."):
            suspicious.append(SuspiciousString(
                value=val_clean, reason="IP address extracted from binary — potential command-and-control or exfiltration endpoint",
                severity="high"
            ))
            seen_values.add(val_clean)
        # URLs
        elif url_pattern.search(val):
            suspicious.append(SuspiciousString(
                value=val_clean, reason="URL found in binary — likely download endpoint, C2 callback, or payload delivery",
                severity="critical"
            ))
            seen_values.add(val_clean)
        # Domains
        elif domain_pattern.search(val) and " " not in val:
            suspicious.append(SuspiciousString(
                value=val_clean, reason="Domain name found — possible C2 infrastructure or phishing endpoint",
                severity="high"
            ))
            seen_values.add(val_clean)
        # Registry persistence
        elif any(k in val_lower for k in ["hklm", "hkcu", "\\currentversion\\run", "\\services\\", "\\software\\microsoft"]):
            suspicious.append(SuspiciousString(
                value=val_clean, reason="Windows registry path — potential persistence mechanism or configuration storage",
                severity="high"
            ))
            seen_values.add(val_clean)
        # Command execution
        elif any(k in val_lower for k in ["cmd.exe", "powershell", "wscript", "cscript", "rundll32", "regsvr32"]):
            suspicious.append(SuspiciousString(
                value=val_clean, reason="System executable reference — potential command execution or LOLBin abuse",
                severity="medium"
            ))
            seen_values.add(val_clean)
        # DLLs of interest
        elif any(k in val_lower for k in ["ws2_32", "wininet", "urlmon", "advapi32", "ntdll", "kernel32"]):
            suspicious.append(SuspiciousString(
                value=val_clean, reason="Windows API DLL reference — indicates capability for network/system operations",
                severity="medium"
            ))
            seen_values.add(val_clean)
        # Crypto/encoding
        elif any(k in val_lower for k in ["encrypt", "decrypt", "base64", "cipher", "aes", "rsa", "xor"]):
            suspicious.append(SuspiciousString(
                value=val_clean, reason="Cryptographic/encoding reference — potential data obfuscation or ransomware activity",
                severity="high"
            ))
            seen_values.add(val_clean)
        # Executable names
        elif val_lower.endswith(".exe") or val_lower.endswith(".dll") or val_lower.endswith(".sys"):
            suspicious.append(SuspiciousString(
                value=val_clean, reason="Executable/library filename — potential dropped payload or injected module",
                severity="medium"
            ))
            seen_values.add(val_clean)
        
        if len(suspicious) >= 10:
            break

    # Add YARA match names as suspicious strings
    for m in yara_matches[:5]:
        rule = m.get("rule", "unknown_rule")
        if rule not in seen_values:
            suspicious.append(SuspiciousString(
                value=rule, reason=f"Matched YARA forensic signature '{rule}' — confirmed malware pattern",
                severity="critical"
            ))
            seen_values.add(rule)

    # If we found suspicious strings, add a timeline event for them
    if suspicious:
        timeline.append(TimelineEvent(
            time="T+6s — IOC Extraction",
            event=f"Indicator extraction complete: {len(suspicious)} IOCs identified (IPs, domains, executables, API refs)",
            mitre_tactic="Collection",
            mitre_technique="T1005"
        ))

    # Always add a conclusion event
    timeline.append(TimelineEvent(
        time="T+7s — Report Generation",
        event=f"ForensiX autonomous agent completed analysis. {len(evidence)} findings, {len(suspicious)} IOCs, {len(timeline)} timeline events generated.",
        mitre_tactic="Collection",
        mitre_technique="T1119"
    ))

    # Build hypothesis
    ioc_types = []
    if any(s.severity == "critical" for s in suspicious):
        ioc_types.append("critical-severity indicators")
    if yara_matches:
        ioc_types.append(f"{len(yara_matches)} YARA signature match(es)")
    if any("IP" in s.reason for s in suspicious):
        ioc_types.append("suspicious IP addresses")
    if any("URL" in s.reason or "domain" in s.reason.lower() for s in suspicious):
        ioc_types.append("malicious URLs/domains")

    if yara_matches:
        hypothesis = (
            f"The analyzed sample triggered {len(yara_matches)} YARA forensic signature(s), confirming "
            f"the presence of known malware patterns. The matched rules "
            f"({', '.join(m.get('rule','?') for m in yara_matches[:3])}) are associated with established "
            f"threat families. Combined with {len(strings_data)} extracted strings containing "
            f"{len(suspicious)} forensic indicators of compromise (IOCs), this sample is classified as "
            f"MALICIOUS with high confidence. Immediate containment and further behavioral analysis is recommended."
        )
    elif suspicious:
        hypothesis = (
            f"Forensic analysis identified {len(suspicious)} indicators of compromise (IOCs) including "
            f"{', '.join(ioc_types) if ioc_types else 'various suspicious artifacts'}. "
            f"The sample contains {len(strings_data)} extracted strings with references to "
            f"system APIs, network endpoints, and potential persistence mechanisms. "
            f"While no YARA signatures matched (possibly indicating novel or polymorphic malware), "
            f"the density of suspicious indicators warrants classification as POTENTIALLY MALICIOUS."
        )
    else:
        hypothesis = (
            f"The autonomous forensic agent executed {len(tool_outputs)} analysis tools against the sample. "
            f"While no definitive malicious indicators were found, this may indicate sophisticated "
            f"obfuscation, packing, or anti-analysis techniques. The sample should be further analyzed "
            f"in a sandbox environment with behavioral monitoring."
        )

    summary = (
        f"ForensiX autonomous agent performed a comprehensive forensic analysis of the submitted sample "
        f"using {len(tool_outputs)} specialized tools (strings extraction, YARA signature scanning, "
        f"memory forensics via Volatility3, and binary carving via Binwalk). "
        f"The investigation identified {len(evidence)} pieces of forensic evidence and "
        f"{len(suspicious)} indicators of compromise (IOCs). "
        + (f"YARA detected {len(yara_matches)} known malware signature(s). " if yara_matches else "")
        + f"The incident timeline contains {len(timeline)} events documenting the complete "
        f"analysis workflow and findings. "
        + ("This sample is classified as MALICIOUS based on signature matches. " if yara_matches else
           "Further behavioral analysis is recommended to determine definitive classification. ")
    )

    final_timeline = timeline[:20]
    final_suspicious = suspicious[:10]
    return CorrelationResult(
        timeline=final_timeline,
        hypothesis=hypothesis,
        evidence=evidence,
        summary=summary,
        suspicious_strings=final_suspicious,
        risk_score=_compute_risk_score(evidence, final_suspicious, final_timeline, len(yara_matches)),
        mitre_tactics=_extract_mitre_tactics(final_timeline),
    )


def correlate(tool_outputs: list[ToolOutput]) -> CorrelationResult:
    capped = [_cap_output(o) for o in tool_outputs]
    user_msg = json.dumps(capped, indent=2)

    last_err = None
    for attempt in range(4):  # 4 retries
        try:
            text = llm_client.call(_SYSTEM, user_msg, max_tokens=3000)
            print(f"[correlator] LLM attempt {attempt+1}, response length: {len(text)}")
            data = _parse_response(text)

            # Validate we got meaningful data (not empty)
            if not data.get("hypothesis") and not data.get("evidence") and not data.get("timeline"):
                raise ValueError("LLM returned empty/meaningless report data")

            tl = [TimelineEvent(**e) for e in data.get("timeline", [])]
            ev = [Finding(**e) for e in data.get("evidence", [])]
            ss = [SuspiciousString(**s) for s in data.get("suspicious_strings", [])]
            return CorrelationResult(
                timeline=tl,
                hypothesis=data.get("hypothesis", "Unable to determine attack hypothesis."),
                evidence=ev,
                summary=data.get("summary", ""),
                suspicious_strings=ss,
                risk_score=_compute_risk_score(ev, ss, tl),
                mitre_tactics=_extract_mitre_tactics(tl),
            )
        except Exception as e:
            last_err = e
            print(f"[correlator] Attempt {attempt+1} failed: {e}")

    # All LLM attempts failed — build report deterministically from raw tool data
    print(f"[correlator] All LLM attempts failed. Building deterministic report from tool data.")
    try:
        return _build_deterministic_report(tool_outputs)
    except Exception as e:
        print(f"[correlator] Deterministic fallback also failed: {e}")
        return CorrelationResult(
            timeline=[],
            hypothesis="Analysis could not be completed due to an error.",
            evidence=[],
            summary=f"Error during correlation: {str(last_err)}",
        )
