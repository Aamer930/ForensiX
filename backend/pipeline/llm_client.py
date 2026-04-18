"""
Unified LLM client.
Set AI_MODE=claude (default) or AI_MODE=ollama in your .env.
Both return the same interface: call(system, user, max_tokens) -> str
"""

import json
import os
import urllib.request
import urllib.error

AI_MODE = os.environ.get("AI_MODE", "claude").lower()


def call(system: str, user: str, max_tokens: int = 2048) -> str:
    if AI_MODE == "ollama":
        return _call_ollama(system, user, max_tokens)
    return _call_claude(system, user, max_tokens)


# ── Claude ────────────────────────────────────────────────────────────────────

def _call_claude(system: str, user: str, max_tokens: int) -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return response.content[0].text.strip()


# ── Ollama ────────────────────────────────────────────────────────────────────

_OLLAMA_BASE = os.environ.get("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
_OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2")


def _call_ollama(system: str, user: str, max_tokens: int) -> str:
    url = f"{_OLLAMA_BASE}/api/chat"
    payload = json.dumps({
        "model": _OLLAMA_MODEL,
        "stream": False,
        "options": {"num_predict": max_tokens},
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
    }).encode()

    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read())
            return data["message"]["content"].strip()
    except urllib.error.URLError as e:
        raise RuntimeError(
            f"Ollama unreachable at {_OLLAMA_BASE}. "
            "Make sure Ollama is running and OLLAMA_BASE_URL is correct."
        ) from e


def active_mode() -> str:
    return f"ollama/{_OLLAMA_MODEL}" if AI_MODE == "ollama" else "claude/claude-sonnet-4-6"
