"""
Unified LLM client.
Set AI_MODE=claude (default) or AI_MODE=ollama in your .env.
Both return the same interface: call(system, user, max_tokens) -> str
"""

import json
import os
import urllib.request
import urllib.error

_ai_mode = os.environ.get("AI_MODE", "claude").lower()


def get_mode() -> str:
    return _ai_mode


def set_mode(mode: str) -> None:
    global _ai_mode
    if mode not in ("claude", "ollama"):
        raise ValueError(f"Unknown mode: {mode}")
    _ai_mode = mode


def call(system: str, user: str, max_tokens: int = 2048) -> str:
    if _ai_mode == "ollama":
        return _call_ollama(system, user, max_tokens)
    return _call_claude(system, user, max_tokens)


# ── Claude ────────────────────────────────────────────────────────────────────

def _call_claude(system: str, user: str, max_tokens: int) -> str:
    key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not key or not key.startswith("sk-"):
        # No valid key — silently fall back to Ollama
        return _call_ollama(system, user, max_tokens)
    import anthropic
    client = anthropic.Anthropic(api_key=key)
    try:
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return response.content[0].text.strip()
    except Exception as e:
        print(f"[llm_client] Claude API error: {e}. Falling back to Ollama.")
        return _call_ollama(system, user, max_tokens)


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
    return f"ollama/{_OLLAMA_MODEL}" if _ai_mode == "ollama" else "claude/claude-3.5-sonnet"
