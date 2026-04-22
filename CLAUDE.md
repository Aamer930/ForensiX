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
       → ToolExecutor (entropy → strings → YARA → Volatility3 → binwalk, sequential)
       → Correlator (LLM — 1 call)  ← also extracts suspicious_strings + mitre_tactics
       → ConfidenceScorer (rule-based)
       → VTClient (VirusTotal enrichment per IOC)
       → JobStore (in-memory + SQLite) + WebSocket stream
```

**Backend** (`backend/`) — FastAPI, Python 3.11
- `main.py` — app entry, CORS, PDF/preview endpoints, AI mode switch endpoints
- `pipeline/llm_client.py` — unified LLM interface; `get_mode()` / `set_mode()` for live switching; auto-falls back to Ollama if Claude key is missing
- `pipeline/executor.py` — orchestrates the full pipeline as an async background task
- `pipeline/selector.py` / `correlator.py` — the two LLM calls
- `pipeline/confidence.py` — rule-based confidence scorer
- `pipeline/vt_client.py` — VirusTotal API enrichment for suspicious IOCs
- `tools/` — one file per forensic tool, each returns a `ToolOutput` Pydantic model
- `tools/entropy_tool.py` — Shannon entropy analysis; per-block histogram + overall score + classification
- `tools/volatility_cache.py` — pre-computed cridex.vmem results, fallback when Volatility3 fails
- `report/pdf_builder.py` — ReportLab PDF with dark cover, logo, confidence bars, suspicious strings table
- `job_store.py` — in-memory dict of `Job` objects; WebSocket event buffering for reconnect replay
- `db.py` — SQLite persistence for completed cases

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
- **MITRE tactic extraction**: `correlator.py::_extract_mitre_tactics()` first uses `mitre_tactic` from timeline events; if absent, falls back to `_TECHNIQUE_TACTIC` dict to infer tactic from technique ID (e.g. `T1059` → `Execution`). This ensures the MITRE heatmap populates even when the LLM omits tactic names.
- **Entropy tool**: always runs as the first mandatory tool (before strings/yara). Block size auto-scales to ~160 blocks regardless of file size. Thresholds: `<5.0` benign, `5–6.5` compressed, `6.5–7.2` packed, `>7.2` encrypted.

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
- `entropy` — pure Python (no deps); Shannon entropy per block, runs first on every file
- `strings` — binutils, available in Debian base image
- `yara-python` — pip, rules in `backend/yara_rules/malware_common.yar`
- `volatility3` — pip install in Dockerfile
- `binwalk` — apt in Dockerfile

## Results Page Sections (in order)

1. **Risk Score + Attack Hypothesis** — animated gauge (0–100) + LLM-generated hypothesis
2. **File Entropy Analysis** — per-block entropy histogram, overall score, classification (benign/compressed/packed/encrypted)
3. **MITRE ATT&CK Coverage** — 14-tactic heatmap; triggered tactics highlighted red with technique dots and hover tooltips
4. **Executive Summary** — 1-paragraph LLM summary (conditional, shown if present)
5. **Incident Timeline** — vertical event list with MITRE tactic/technique badges
6. **Interactive Threat Graph** — SVG force-simulation graph; nodes = root + evidence + IOCs; drag to explore
7. **Evidence Table** — findings with source tool and confidence bars
8. **Suspicious Strings** — IOCs color-coded by severity (critical/high/medium/low), with VirusTotal enrichment notes
9. **Tool Execution** — success/failure grid for all tools that ran

## Frontend Components

| Component | Description |
|-----------|-------------|
| `ThreatGraph.tsx` | Custom SVG force-simulation graph. Uses `viewBox` for DPI-independence (Mac Retina safe). No canvas. Drag via `getScreenCTM().inverse()`. Simulation cools after 260 frames. |
| `MitreHeatmap.tsx` | 14-tactic ATT&CK grid. Matching handles names, IDs, short codes, aliases, and partial strings. Technique→tactic fallback via `TECHNIQUE_TACTIC` map. Responsive with `overflow-x-auto`. |
| `EntropyChart.tsx` | SVG bar chart of per-block entropy. `preserveAspectRatio="none"` for full-width stretch. Dashed threshold lines at 5.0, 6.5, 7.2. Hex offset X-axis. Three stat cards below. |
| `Timeline.tsx` | Vertical timeline with MITRE badges |
| `EvidenceTable.tsx` | Findings table with confidence progress bars |
| `ThreatRiskScore.tsx` | Animated SVG circle gauge (0–100) |
| `ConfidenceBadge.tsx` | Inline confidence percentage badge |
| `TerminalStream.tsx` | Live WebSocket event terminal |
| `BootScreen.tsx` | Initial splash screen |

## Adding New YARA Rules

Drop `.yar` files into `backend/yara_rules/`. Auto-discovered by `tools/yara_tool.py` on first scan (compiled once and cached in `_compiled_rules`).

## Adding New Forensic Tools

1. Create `backend/tools/<name>_tool.py` — return `ToolOutput(tool="<name>", success=bool, data={...})`
2. Add dispatch case in `executor.py::_execute_tool()`
3. Add summary case in `executor.py::_summarize_output()`
4. Either add to `mandatory_tools` list or let `selector.py` choose it (add to valid tool set)
5. Add cap logic in `correlator.py::_cap_output()` if output could be large

## Environment Variables

- `AI_MODE` — `ollama` (default) or `claude`
- `ANTHROPIC_API_KEY` — required only if `AI_MODE=claude`, set in `.env`
- `OLLAMA_BASE_URL` — default `http://host.docker.internal:11434`
- `OLLAMA_MODEL` — default `llama3.2`
- `VT_API_KEY` — optional; enables VirusTotal enrichment for suspicious IOCs
