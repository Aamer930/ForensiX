import subprocess
import re
from models import ToolOutput


def run_binwalk(file_path: str) -> ToolOutput:
    try:
        result = subprocess.run(
            ["binwalk", "--entropy", file_path],
            capture_output=True, text=True, timeout=60
        )
        carved = _parse_binwalk(result.stdout)
        return ToolOutput(tool="binwalk", success=True, data={"carved": carved, "raw_lines": len(result.stdout.splitlines())})
    except subprocess.TimeoutExpired:
        return ToolOutput(tool="binwalk", success=False, data={}, error="Timeout after 60s")
    except FileNotFoundError:
        return ToolOutput(tool="binwalk", success=False, data={}, error="binwalk not found")


def _parse_binwalk(output: str) -> list[dict]:
    # Example line: "0          0x0        Microsoft executable, portable (PE)"
    pattern = re.compile(r"^(\d+)\s+(0x[0-9A-Fa-f]+)\s+(.+)$")
    results = []
    for line in output.splitlines():
        m = pattern.match(line.strip())
        if m:
            results.append({
                "offset": int(m.group(1)),
                "hex_offset": m.group(2),
                "description": m.group(3).strip(),
            })
    return results[:50]
