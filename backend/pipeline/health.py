"""
Startup health check — warns if the configured AI backend is unreachable.
"""
import os
import urllib.request
import urllib.error


def check_ai_backend() -> None:
    mode = os.environ.get("AI_MODE", "claude").lower()

    if mode == "ollama":
        base = os.environ.get("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
        model = os.environ.get("OLLAMA_MODEL", "llama3.2")
        try:
            req = urllib.request.Request(f"{base}/api/tags", method="GET")
            with urllib.request.urlopen(req, timeout=5) as r:
                import json
                data = json.loads(r.read())
                names = [m.get("name", "") for m in data.get("models", [])]
                if not any(model in n for n in names):
                    print(f"\n⚠  WARNING: Ollama is running but model '{model}' is not pulled.")
                    print(f"   Run: ollama pull {model}\n")
                else:
                    print(f"✓  Ollama ready — model '{model}' found")
        except Exception:
            print(f"\n⚠  WARNING: Ollama not reachable at {base}")
            print("   Make sure Ollama is running on your host machine.")
            print("   Run: ollama serve\n")

    elif mode == "claude":
        key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not key or not key.startswith("sk-"):
            print("\n⚠  WARNING: ANTHROPIC_API_KEY is missing or invalid.")
            print("   Set it in your .env file.\n")
        else:
            print("✓  Claude API key found")
