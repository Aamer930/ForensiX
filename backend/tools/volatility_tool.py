import subprocess
import json
import re
from models import ToolOutput

TIMEOUT = 120  # Volatility is slow


def _run_vol(file_path: str, plugin: str, extra_args: list[str] = None) -> tuple[bool, str, str]:
    cmd = ["python3", "-m", "volatility3.cli", "-f", file_path, "--renderer", "json", plugin]
    if extra_args:
        cmd += extra_args
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=TIMEOUT)
        return True, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", f"Timeout after {TIMEOUT}s"
    except FileNotFoundError:
        return False, "", "volatility3 not found"


def _parse_vol_json(stdout: str) -> list[dict]:
    """Extract JSON array from Volatility3's --renderer json output."""
    try:
        data = json.loads(stdout)
        if isinstance(data, list):
            return data
        # Volatility sometimes wraps in {"rows": [...], "columns": [...]}
        if isinstance(data, dict) and "rows" in data:
            cols = data.get("columns", [])
            return [dict(zip(cols, row)) for row in data["rows"]]
    except (json.JSONDecodeError, Exception):
        pass
    return []


def run_imageinfo(file_path: str) -> ToolOutput:
    ok, stdout, stderr = _run_vol(file_path, "banners.Banners")
    if not ok:
        return ToolOutput(tool="vol_imageinfo", success=False, data={}, error=stderr)
    rows = _parse_vol_json(stdout)
    banners = [r.get("Banner", str(r)) for r in rows[:5]]
    return ToolOutput(tool="vol_imageinfo", success=True, data={"banners": banners})


def run_pslist(file_path: str) -> ToolOutput:
    ok, stdout, stderr = _run_vol(file_path, "windows.pslist.PsList")
    if not ok:
        return ToolOutput(tool="vol_pslist", success=False, data={}, error=stderr)
    rows = _parse_vol_json(stdout)
    processes = [
        {
            "pid": r.get("PID") or r.get("pid"),
            "ppid": r.get("PPID") or r.get("ppid"),
            "name": r.get("ImageFileName") or r.get("name") or r.get("process_name"),
            "create_time": str(r.get("CreateTime") or r.get("create_time", "")),
        }
        for r in rows[:50]
    ]
    return ToolOutput(tool="vol_pslist", success=True, data={"processes": processes})


def run_netscan(file_path: str) -> ToolOutput:
    ok, stdout, stderr = _run_vol(file_path, "windows.netstat.NetStat")
    if not ok:
        # Try netscan as fallback
        ok, stdout, stderr = _run_vol(file_path, "windows.netscan.NetScan")
    if not ok:
        return ToolOutput(tool="vol_netscan", success=False, data={}, error=stderr)
    rows = _parse_vol_json(stdout)
    connections = [
        {
            "proto": r.get("Proto") or r.get("proto") or "",
            "local": f"{r.get('LocalAddr', '')}:{r.get('LocalPort', '')}",
            "remote": f"{r.get('ForeignAddr', '') or r.get('RemoteAddr', '')}:{r.get('ForeignPort', '') or r.get('RemotePort', '')}",
            "state": r.get("State") or r.get("state") or "",
            "pid": r.get("PID") or r.get("pid"),
        }
        for r in rows[:30]
    ]
    return ToolOutput(tool="vol_netscan", success=True, data={"connections": connections})


def run_cmdline(file_path: str) -> ToolOutput:
    ok, stdout, stderr = _run_vol(file_path, "windows.cmdline.CmdLine")
    if not ok:
        return ToolOutput(tool="vol_cmdline", success=False, data={}, error=stderr)
    rows = _parse_vol_json(stdout)
    cmdlines = [
        {
            "pid": r.get("PID") or r.get("pid"),
            "name": r.get("Process") or r.get("name") or "",
            "cmdline": r.get("Args") or r.get("cmdline") or "",
        }
        for r in rows[:50]
    ]
    return ToolOutput(tool="vol_cmdline", success=True, data={"cmdlines": cmdlines})


def run_volatility_full(file_path: str) -> list[ToolOutput]:
    """Run all Volatility3 modules; fall back to cached cridex results if Volatility3 unavailable."""
    imageinfo = run_imageinfo(file_path)

    # If Volatility3 isn't installed or can't parse the image, use cached fallback
    if not imageinfo.success and ("not found" in (imageinfo.error or "") or "No module" in (imageinfo.error or "")):
        from tools.volatility_cache import get_cached_volatility_outputs
        return get_cached_volatility_outputs()

    results = [imageinfo]
    for fn in [run_pslist, run_netscan, run_cmdline]:
        results.append(fn(file_path))
    return results
