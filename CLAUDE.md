# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ForensiX is a university project — an autonomous forensic analysis agent. Users upload forensic artifacts (memory dumps, PE executables, log files), an AI agent selects and runs forensic tools, correlates findings, flags suspicious strings with severity explanations, and generates a professional PDF report.

## Running the Project

**Full stack (Docker — recommended):**
```bash
# Edit .env — set ANTHROPIC_API_KEY (defaults to claude mode)
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
       → ToolExecutor: entropy (always first, no LLM)
       → Agent Loop ×N: ToolSelector (LLM — 1 call per step, max 9)
                      → execute tool → _emit_reason → AgentReasoningStep + llm_reason WS event
       → Correlator (LLM — 1 final call)  ← multi-hypothesis + tool_source on timeline
       → ConfidenceScorer (rule-based)
       → AdversaryProfiler (TTP lookup table — no LLM)
       → VTClient (VirusTotal enrichment per IOC)
       → JobStore (in-memory + SQLite) + WebSocket stream
```

**Backend** (`backend/`) — FastAPI, Python 3.11
- `main.py` — app entry, CORS, PDF/preview endpoints, AI mode switch endpoints
- `pipeline/llm_client.py` — unified LLM interface; `get_mode()` / `set_mode()` for live switching; raises descriptive `RuntimeError` on Claude failures (auth, rate-limit, timeout, network) — no silent fallback
- `pipeline/executor.py` — iterative agent loop; entropy mandatory first; `_emit_reason()` logs every AI decision
- `pipeline/selector.py` — one LLM call per agent step; returns `{next_tool, reasoning}`
- `pipeline/correlator.py` — final LLM call; produces 3 hypotheses + `tool_source` on timeline events
- `pipeline/adversary.py` — TTP-based adversary attribution; 6 hardcoded threat actor profiles
- `pipeline/confidence.py` — rule-based confidence scorer
- `pipeline/health.py` — backend health check endpoint
- `pipeline/router.py` — file-type-based tool routing logic
- `routers/upload.py` — file ingestion endpoint; triggers pipeline
- `routers/ws.py` — WebSocket endpoint; replays buffered events on reconnect
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
- New components: `HypothesisPanel`, `AdversaryCard`, `EvidenceDrawer` (slide-out on timeline click)
- No state management library — local `useState` only

## Key Constraints

- **LLM calls**: up to 10 per job (1 per agent tool-decision step, max 9) + 1 final correlation. Uses `claude-sonnet-4-6` or Ollama depending on `AI_MODE`.
- **Agent loop max**: `MAX_AGENT_STEPS = 9` in `executor.py`. Entropy always runs first with no LLM call.
- **Agent reasoning**: every step logged as `AgentReasoningStep` in `job.agent_reasoning`; emitted as `llm_reason` WS event with `{step, chosen_tool, reasoning, findings_so_far}`.
- **Tool output caps**: strings → 80 items (correlator), pslist → 30, netscan → 30, cmdline → 20. Applied in `correlator.py::_cap_output()`.
- **Suspicious strings**: correlator asks the LLM to return up to 10 forensically significant strings with `value`, `reason`, and `severity` (critical/high/medium/low). Stored in `CorrelationResult.suspicious_strings`.
- **Confidence scoring** is rule-based in `pipeline/confidence.py`, not LLM-generated.
- **Volatility3 fallback**: if `vol_imageinfo` fails, `run_volatility_full()` returns cached cridex.vmem results from `tools/volatility_cache.py`.
- **Demo sample**: `sample/cridex.vmem` (real Windows XP memory image with Cridex banking trojan infection — widely used in Volatility3 tutorials). The "Load Demo Sample" button calls `POST /api/upload-sample`.
- **AI mode default**: `AI_MODE=claude` in `.env`. If key is missing/invalid, pipeline fails with a visible error — no silent Ollama fallback. Toggle on Upload page switches mode live without restart.
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

1. **Risk Score + Attack Hypotheses** — animated gauge (0–100) + 3 ranked hypotheses with confidence bars (`HypothesisPanel`)
2. **File Entropy Analysis** — per-block entropy histogram, overall score, classification (benign/compressed/packed/encrypted)
3. **MITRE ATT&CK Coverage** — 14-tactic heatmap; triggered tactics highlighted red with technique dots and hover tooltips
4. **Adversary Attribution** — threat actor card if TTP match found (conditional)
5. **Executive Summary** — 1-paragraph LLM summary (conditional, shown if present)
6. **Incident Timeline** — vertical event list with MITRE badges + tool_source badges; click → `EvidenceDrawer`
7. **Interactive Threat Graph** — SVG force-simulation graph; nodes = root + evidence + IOCs; drag to explore
8. **Evidence Table** — findings with source tool and confidence bars
9. **Suspicious Strings** — IOCs color-coded by severity (critical/high/medium/low), with VirusTotal enrichment notes
10. **Tool Execution** — success/failure grid for all tools that ran
11. **Agent Reasoning Log** — collapsible; shows all `AgentReasoningStep` decisions

## Frontend Components

| Component | Description |
|-----------|-------------|
| `ThreatGraph.tsx` | Custom SVG force-simulation graph. Uses `viewBox` for DPI-independence (Mac Retina safe). No canvas. Drag via `getScreenCTM().inverse()`. Simulation cools after 260 frames. |
| `MitreHeatmap.tsx` | 14-tactic ATT&CK grid. Matching handles names, IDs, short codes, aliases, and partial strings. Technique→tactic fallback via `TECHNIQUE_TACTIC` map. Responsive with `overflow-x-auto`. |
| `EntropyChart.tsx` | SVG bar chart of per-block entropy. `preserveAspectRatio="none"` for full-width stretch. Dashed threshold lines at 5.0, 6.5, 7.2. Hex offset X-axis. Three stat cards below. |
| `Timeline.tsx` | Vertical timeline with MITRE badges + purple tool_source badge. `onEventClick` prop triggers `EvidenceDrawer`. |
| `EvidenceDrawer.tsx` | Slide-out right-side drawer. Shows raw tool output for clicked timeline event. Closes on backdrop, X, or Escape. |
| `HypothesisPanel.tsx` | 3 ranked hypothesis cards (red/yellow/grey). Confidence bars. Falls back to plain text if hypotheses array empty. |
| `AdversaryCard.tsx` | Purple-themed card: actor name, motivation, confidence %, TTP badges, notes. Shown if `correlation.adversary` present. |
| `EvidenceTable.tsx` | Findings table with confidence progress bars |
| `ThreatRiskScore.tsx` | Animated SVG circle gauge (0–100) |
| `ConfidenceBadge.tsx` | Inline confidence percentage badge |
| `TerminalStream.tsx` | Live WebSocket event terminal; `llm_reason` events show as expandable purple THINK rows |
| `BootScreen.tsx` | Initial splash screen; shown once per browser session (`sessionStorage`). App content hidden (`visibility:hidden, opacity:0`) until boot completes, then fades in. |

## Adding New YARA Rules

Drop `.yar` files into `backend/yara_rules/`. Auto-discovered by `tools/yara_tool.py` on first scan (compiled once and cached in `_compiled_rules`).

## Adding New Forensic Tools

1. Create `backend/tools/<name>_tool.py` — return `ToolOutput(tool="<name>", success=bool, data={...})`
2. Add dispatch case in `executor.py::_execute_tool()`
3. Add summary case in `executor.py::_summarize_output()`
4. Either add to `mandatory_tools` list or let `selector.py` choose it (add to valid tool set)
5. Add cap logic in `correlator.py::_cap_output()` if output could be large

## Environment Variables

- `AI_MODE` — `claude` (default) or `ollama`
- `ANTHROPIC_API_KEY` — required only if `AI_MODE=claude`, set in `.env`
- `OLLAMA_BASE_URL` — default `http://host.docker.internal:11434`
- `OLLAMA_MODEL` — default `llama3.2`
- `VT_API_KEY` — optional; enables VirusTotal enrichment for suspicious IOCs
