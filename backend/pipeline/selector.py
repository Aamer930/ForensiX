import json
import os
import anthropic
from models import FileType

_client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

_DEFAULT_TOOLS: dict[str, list[str]] = {
    FileType.memory_dump: ["strings", "yara", "volatility3"],
    FileType.pe_executable: ["strings", "yara", "binwalk"],
    FileType.log_file: ["strings"],
    FileType.disk_image: ["strings", "binwalk"],
    FileType.unknown: ["strings", "yara"],
}

_SYSTEM = """You are a forensic tool selector. Given a file type and a sample of extracted strings,
return a JSON object with a "tools" key containing an ordered list of tools to run.
Available tools: ["strings", "yara", "volatility3", "binwalk"]
Rules:
- Only include volatility3 for memory_dump file types
- Always include strings and yara for pe_executable
- Return ONLY valid JSON, no markdown, no explanation
Example output: {"tools": ["strings", "yara", "volatility3"]}"""


def select_tools(file_type: FileType, strings_sample: list[str]) -> list[str]:
    sample_text = "\n".join(strings_sample[:50]) if strings_sample else "(no strings extracted yet)"
    user_msg = f"file_type={file_type.value}\nstrings_sample:\n{sample_text}"

    for attempt in range(2):
        try:
            response = _client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=256,
                system=_SYSTEM,
                messages=[{"role": "user", "content": user_msg}],
            )
            text = response.content[0].text.strip()
            data = json.loads(text)
            tools = data.get("tools", [])
            valid = {"strings", "yara", "volatility3", "binwalk"}
            return [t for t in tools if t in valid]
        except Exception:
            continue

    # Fallback to defaults
    return _DEFAULT_TOOLS.get(file_type, ["strings", "yara"])
