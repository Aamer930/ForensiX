import subprocess
import re
from models import ToolOutput


def run_binwalk(file_path: str) -> ToolOutput:
    try:
        # Standard scan (not --entropy) to identify embedded files
        result = subprocess.run(
            ["binwalk", file_path],
            capture_output=True, text=True, timeout=60
        )
        carved = _parse_binwalk(result.stdout)
        
        # Also run entropy analysis for additional insight
        entropy_result = subprocess.run(
            ["binwalk", "-E", "--csv", file_path],
            capture_output=True, text=True, timeout=60
        )
        entropy_info = _parse_entropy(entropy_result.stdout)
        
        return ToolOutput(
            tool="binwalk", success=True,
            data={
                "carved": carved,
                "entropy": entropy_info,
                "raw_lines": len(result.stdout.splitlines())
            }
        )
    except subprocess.TimeoutExpired:
        return ToolOutput(tool="binwalk", success=False, data={}, error="Timeout after 60s")
    except FileNotFoundError:
        return ToolOutput(tool="binwalk", success=False, data={}, error="binwalk not found")


def _parse_binwalk(output: str) -> list[dict]:
    """Parse binwalk standard scan output."""
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


def _parse_entropy(output: str) -> dict:
    """Parse binwalk entropy CSV output to determine if binary is packed/encrypted."""
    lines = [l for l in output.strip().splitlines() if l and not l.startswith("#")]
    if not lines:
        return {"packed": False, "avg_entropy": 0.0}
    
    entropies = []
    for line in lines:
        parts = line.split(",")
        if len(parts) >= 2:
            try:
                entropies.append(float(parts[1]))
            except ValueError:
                continue
    
    if not entropies:
        return {"packed": False, "avg_entropy": 0.0}
    
    avg = sum(entropies) / len(entropies)
    # Entropy > 0.9 suggests packing/encryption
    return {
        "packed": avg > 0.9,
        "avg_entropy": round(avg, 3),
        "max_entropy": round(max(entropies), 3),
        "samples": len(entropies)
    }
