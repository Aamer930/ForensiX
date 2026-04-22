import subprocess
import re
from models import ToolOutput

MIN_LEN = 4  # Lowered from 6 to catch more IOCs (short IPs, DLL names)
MAX_STRINGS = 500


def run_strings(file_path: str) -> ToolOutput:
    try:
        # Run both ASCII and Unicode (wide) string extraction
        result_ascii = subprocess.run(
            ["strings", "-n", str(MIN_LEN), file_path],
            capture_output=True, text=True, timeout=60
        )
        result_unicode = subprocess.run(
            ["strings", "-n", str(MIN_LEN), "-el", file_path],
            capture_output=True, text=True, timeout=60
        )
        raw_ascii = result_ascii.stdout.splitlines()
        raw_unicode = result_unicode.stdout.splitlines()
        raw = raw_ascii + raw_unicode
    except subprocess.TimeoutExpired:
        return ToolOutput(tool="strings", success=False, data={}, error="Timeout after 60s")
    except FileNotFoundError:
        return ToolOutput(tool="strings", success=False, data={}, error="strings binary not found")

    filtered = _filter_strings(raw)
    return ToolOutput(tool="strings", success=True, data={
        "strings": filtered,
        "total_raw": len(raw),
        "ascii_count": len(raw_ascii),
        "unicode_count": len(raw_unicode),
    })


def _filter_strings(lines: list[str]) -> list[str]:
    seen = set()
    priority = []
    normal = []

    ip_re = re.compile(r"\b\d{1,3}(?:\.\d{1,3}){3}\b")
    url_re = re.compile(r"https?://|ftp://", re.I)
    file_re = re.compile(r"\.(exe|dll|bat|ps1|sys|drv|vbs|js|cmd|scr|com|pif)\b", re.I)
    reg_re = re.compile(r"HKEY_|HKLM|HKCU|SOFTWARE\\|SYSTEM\\|CurrentVersion\\Run", re.I)
    api_re = re.compile(r"(CreateProcess|VirtualAlloc|WriteProcessMemory|LoadLibrary|GetProcAddress|WinExec|ShellExecute|RegOpenKey|InternetOpen|HttpSendRequest|WSAStartup|connect|socket|recv|send)\b", re.I)
    domain_re = re.compile(r"[a-zA-Z0-9][-a-zA-Z0-9]*\.(com|net|org|ru|cn|tk|info|biz|cc|xyz|io|pw)\b", re.I)

    for line in lines:
        line = line.strip()
        if not line or len(line) < MIN_LEN or line in seen:
            continue
        # Skip very long garbage strings (common in binary dumps)
        if len(line) > 300:
            continue
        seen.add(line)
        
        if (ip_re.search(line) or url_re.search(line) or file_re.search(line)
                or reg_re.search(line) or api_re.search(line) or domain_re.search(line)):
            priority.append(line)
        else:
            normal.append(line)

    combined = priority + normal
    return combined[:MAX_STRINGS]
