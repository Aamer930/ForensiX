from math import log2
from models import ToolOutput


def run_entropy(file_path: str) -> ToolOutput:
    try:
        with open(file_path, 'rb') as f:
            data = f.read()

        if not data:
            return ToolOutput(tool="entropy", success=False, data={}, error="Empty file")

        file_size = len(data)
        # Target ~160 display blocks; minimum 256 B per block
        block_size = max(256, file_size // 160)

        blocks = []
        for offset in range(0, file_size, block_size):
            chunk = data[offset:offset + block_size]
            if len(chunk) < 32:          # skip tiny tail
                continue
            blocks.append({
                "offset": offset,
                "entropy": round(_entropy(chunk), 3),
            })

        overall = _entropy(data)

        if overall >= 7.2:
            classification = "encrypted"
        elif overall >= 6.5:
            classification = "packed"
        elif overall >= 5.0:
            classification = "compressed"
        else:
            classification = "benign"

        high_regions = sum(1 for b in blocks if b["entropy"] >= 7.0)

        return ToolOutput(
            tool="entropy",
            success=True,
            data={
                "blocks":           blocks,
                "overall_entropy":  round(overall, 3),
                "classification":   classification,
                "high_entropy_regions": high_regions,
                "file_size":        file_size,
                "block_size":       block_size,
            },
        )
    except Exception as e:
        return ToolOutput(tool="entropy", success=False, data={}, error=str(e))


def _entropy(data: bytes) -> float:
    if not data:
        return 0.0
    freq = [0] * 256
    for b in data:
        freq[b] += 1
    n = len(data)
    h = 0.0
    for c in freq:
        if c:
            p = c / n
            h -= p * log2(p)
    return h
