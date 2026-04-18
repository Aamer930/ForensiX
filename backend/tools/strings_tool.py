import subprocess
import re
from models import ToolOutput

MIN_LEN = 6
MAX_STRINGS = 500


def run_strings(file_path: str) -> ToolOutput:
    try:
        result = subprocess.run(
            ["strings", "-n", str(MIN_LEN), file_path],
            capture_output=True, text=True, timeout=60
        )
        raw = result.stdout.splitlines()
    except subprocess.TimeoutExpired:
        return ToolOutput(tool="strings", success=False, data={}, error="Timeout after 60s")
    except FileNotFoundError:
        return ToolOutput(tool="strings", success=False, data={}, error="strings binary not found")

    filtered = _filter_strings(raw)
    return ToolOutput(tool="strings", success=True, data={"strings": filtered, "total_raw": len(raw)})


def _filter_strings(lines: list[str]) -> list[str]:
    seen = set()
    result = []
    # Prioritize interesting strings: IPs, URLs, paths, registry keys, suspicious keywords
    priority = []
    normal = []

    ip_re = re.compile(r"\b\d{1,3}(?:\.\d{1,3}){3}\b")
    url_re = re.compile(r"https?://|ftp://|\\.exe|\\.dll|\\.bat|\\.ps1", re.I)
    reg_re = re.compile(r"HKEY_|SOFTWARE\\|SYSTEM\\", re.I)

    for line in lines:
        line = line.strip()
        if not line or line in seen:
            continue
        seen.add(line)
        if ip_re.search(line) or url_re.search(line) or reg_re.search(line):
            priority.append(line)
        else:
            normal.append(line)

    combined = priority + normal
    return combined[:MAX_STRINGS]
