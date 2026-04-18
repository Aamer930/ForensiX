# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ForensiX is a university project — an autonomous forensic analysis agent. Users upload forensic artifacts (memory dumps, PE executables, log files), an AI agent selects and runs forensic tools, correlates findings, flags suspicious strings with severity explanations, and generates a professional PDF report.

## Running the Project

**Full stack (Docker — recommended):**
```bash
# Edit .env — set ANTHROPIC_API_KEY if using Claude mode (defaults to ollama)
docker compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
```

**Backend dev (no Docker):**
```bash
cd backend
pip install -r requirements.txt
AI_MODE=ollama uvicorn main:app --reload
```

**Frontend dev:**
```bash
cd frontend
npm install
npm run dev   # http://localhost:5173 — proxies /api and /ws to :8000
```

## Architecture

```
Upload → FileTypeRouter (python-magic)
       → ToolSelector (LLM — 1 call)
       → ToolExecutor (strings → YARA → Volatility3 → binwalk, sequential)
       → Correlator (LLM — 1 call)  ← also extracts suspicious_strings
       → ConfidenceScorer (rule-based)
       → JobStore (in-memory) + WebSocket stream
```

**Backend** (`backend/`) — FastAPI, Python 3.11
- `main.py` — app entry, CORS, PDF/preview endpoints, AI mode switch endpoints
- `pipeline/llm_client.py` — unified LLM interface; `get_mode()` / `set_mode()` for live switching; auto-falls back to Ollama if Claude key is missing
- `pipeline/executor.py` — orchestrates the full pipeline as an async background task
- `pipeline/selector.py` / `correlator.py` — the two LLM calls
- `pipeline/confidence.py` — rule-based confidence scorer
- `tools/` — one file per forensic tool, each returns a `ToolOutput` Pydantic model
- `tools/volatility_cache.py` — pre-computed cridex.vmem results, fallback when Volatility3 fails
- `report/pdf_builder.py` — ReportLab PDF with dark cover, logo, confidence bars, suspicious strings table
- `job_store.py` — in-memory dict of `Job` objects; WebSocket event buffering for reconnect replay

**Frontend** (`frontend/`) — React + Vite + Tailwind CSS
- Pages: `Upload` → `LiveAgent` → `Results` → `Report`
- AI mode toggle button on Upload page (calls `POST /api/ai-mode` — live switch, no restart)
- WebSocket in `LiveAgent.tsx` auto-reconnects with exponential backoff and replays buffered events
- No state management library — local `useState` only

## Key Constraints

- **LLM calls**: exactly 2 per job (tool selection + correlation). Both use `claude-sonnet-4-6` or Ollama depending on `AI_MODE`.
- **Tool output caps**: strings → 80 items (correlator), pslist → 30, netscan → 30, cmdline → 20. Applied in `correlator.py::_cap_output()`.
- **Suspicious strings**: correlator asks the LLM to return up to 10 forensically significant strings with `value`, `reason`, and `severity` (critical/high/medium/low). Stored in `CorrelationResult.suspicious_strings`.
- **Confidence scoring** is rule-based in `pipeline/confidence.py`, not LLM-generated.
- **Volatility3 fallback**: if `vol_imageinfo` fails, `run_volatility_full()` returns cached cridex.vmem results from `tools/volatility_cache.py`.
- **Demo sample**: `sample/cridex.vmem` (synthetic MDMP with realistic forensic strings). The "Load Demo Sample" button calls `POST /api/upload-sample`.
- **AI mode default**: `AI_MODE=ollama` in `.env`. If `AI_MODE=claude` but no valid key is set, `llm_client` silently falls back to Ollama.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/upload` | Upload artifact, start pipeline |
| POST | `/api/upload-sample` | Load bundled cridex.vmem demo |
| GET | `/api/jobs/{id}` | Poll job status + results |
| GET | `/api/jobs/{id}/report` | Download PDF (attachment) |
| GET | `/api/jobs/{id}/report/preview` | PDF inline preview for browser |
| GET | `/api/ai-mode` | Get current AI backend |
| POST | `/api/ai-mode` | Switch AI backend live `{"mode": "claude"\|"ollama"}` |
| WS | `/ws/{id}` | WebSocket stream for live agent events |

## Forensic Tools

All tools run inside Docker. No host installation needed.
- `strings` — binutils, available in Debian base image
- `yara-python` — pip, rules in `backend/yara_rules/malware_common.yar`
- `volatility3` — pip install in Dockerfile
- `binwalk` — apt in Dockerfile

## Adding New YARA Rules

Drop `.yar` files into `backend/yara_rules/`. Auto-discovered by `tools/yara_tool.py` on first scan (compiled once and cached in `_compiled_rules`).

## Environment Variables

- `AI_MODE` — `ollama` (default) or `claude`
- `ANTHROPIC_API_KEY` — required only if `AI_MODE=claude`, set in `.env`
- `OLLAMA_BASE_URL` — default `http://host.docker.internal:11434`
- `OLLAMA_MODEL` — default `llama3.2`
