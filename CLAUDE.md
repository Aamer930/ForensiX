# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ForensiX is a university project — an autonomous forensic analysis agent. Users upload forensic artifacts (memory dumps, PE executables, log files), an AI agent selects and runs forensic tools, correlates findings via Claude API, and generates a PDF report with incident timeline and evidence table.

## Running the Project

**Full stack (Docker — recommended):**
```bash
cp .env.example .env          # add your ANTHROPIC_API_KEY
docker compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
```

**Backend dev (no Docker):**
```bash
cd backend
pip install -r requirements.txt
ANTHROPIC_API_KEY=sk-... uvicorn main:app --reload
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
       → ToolSelector (Claude API — 1 call)
       → ToolExecutor (strings → YARA → Volatility3 → binwalk, sequential)
       → Correlator (Claude API — 1 call)
       → ConfidenceScorer (rule-based)
       → JobStore (in-memory) + WebSocket stream
```

**Backend** (`backend/`) — FastAPI, Python 3.11
- `main.py` — app entry, CORS, PDF download endpoint
- `pipeline/executor.py` — orchestrates the full pipeline as an async background task
- `pipeline/selector.py` / `correlator.py` — the two Claude API calls
- `tools/` — one file per forensic tool, each returns a `ToolOutput` Pydantic model
- `tools/volatility_cache.py` — pre-computed cridex.vmem results, used as fallback when Volatility3 isn't installed
- `job_store.py` — in-memory dict of `Job` objects; WebSocket event buffering for reconnect replay

**Frontend** (`frontend/`) — React + Vite + Tailwind CSS
- Pages: `Upload` → `LiveAgent` → `Results` → `Report`
- WebSocket in `LiveAgent.tsx` auto-reconnects with exponential backoff and replays buffered events
- No state management library — local `useState` only

## Key Constraints

- **Claude API calls**: exactly 2 per job (tool selection + correlation). Both use `claude-sonnet-4-6`.
- **Tool output caps**: strings → 500 items, pslist → 50, netscan → 30, cmdline → 20. Applied in `correlator.py::_cap_output()` before sending to Claude.
- **Confidence scoring** is rule-based in `pipeline/confidence.py`, not LLM-generated. YARA hit = 90%, external network connection = 80%, suspicious process = 75%, strings pattern = 60%.
- **Volatility3 fallback**: if `vol_imageinfo` fails with "not found", `run_volatility_full()` returns cached cridex.vmem results from `tools/volatility_cache.py`.
- **Demo sample**: `sample/cridex.vmem` (Windows XP SP2 memory image, public domain). The "Load Demo Sample" button calls `POST /api/upload-sample`.

## Forensic Tools

All tools run inside Docker. No host installation needed.
- `strings` — binutils, available in Debian base image
- `yara-python` — pip, rules in `backend/yara_rules/malware_common.yar`
- `volatility3` — pip install in Dockerfile
- `binwalk` — apt in Dockerfile

## Adding New YARA Rules

Drop `.yar` files into `backend/yara_rules/`. They are auto-discovered by `tools/yara_tool.py` on first scan (compiled once and cached in `_compiled_rules`).

## Environment Variables

- `ANTHROPIC_API_KEY` — required, set in `.env` (see `.env.example`)
