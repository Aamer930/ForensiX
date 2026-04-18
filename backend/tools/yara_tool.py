import os
import yara
from models import ToolOutput

RULES_DIR = os.path.join(os.path.dirname(__file__), "..", "yara_rules")
_compiled_rules = None


def _get_rules():
    global _compiled_rules
    if _compiled_rules is not None:
        return _compiled_rules

    rule_files = {}
    for fname in os.listdir(RULES_DIR):
        if fname.endswith(".yar") or fname.endswith(".yara"):
            namespace = fname.rsplit(".", 1)[0]
            rule_files[namespace] = os.path.join(RULES_DIR, fname)

    if not rule_files:
        return None

    _compiled_rules = yara.compile(filepaths=rule_files)
    return _compiled_rules


def run_yara(file_path: str) -> ToolOutput:
    try:
        rules = _get_rules()
        if rules is None:
            return ToolOutput(tool="yara", success=True, data={"matches": [], "note": "No rules loaded"})

        matches = rules.match(file_path, timeout=60)
        formatted = [
            {
                "rule": m.rule,
                "namespace": m.namespace,
                "tags": list(m.tags),
                "meta": dict(m.meta),
            }
            for m in matches
        ]
        return ToolOutput(tool="yara", success=True, data={"matches": formatted, "total": len(formatted)})

    except yara.TimeoutError:
        return ToolOutput(tool="yara", success=False, data={}, error="YARA scan timeout")
    except Exception as e:
        return ToolOutput(tool="yara", success=False, data={}, error=str(e))
