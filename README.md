<div align="center">

# 🔍 ForensiX
### Autonomous Forensic Agent

**From artefact to incident timeline — powered by AI**

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)
[![Claude](https://img.shields.io/badge/Claude-API-D97706?style=flat-square)](https://anthropic.com)
[![Ollama](https://img.shields.io/badge/Ollama-Local_LLM-black?style=flat-square)](https://ollama.ai)
[![License](https://img.shields.io/badge/License-MIT-00C9A7?style=flat-square)](LICENSE)

<br/>

> Upload a forensic artefact. Watch the AI decide which tools to run.
> Get a full incident report in minutes — no manual analysis required.

<br/>

[Features](#-features) • [Quick Start](#-quick-start) • [How It Works](#-how-it-works) • [AI Modes](#-ai-modes) • [Screenshots](#-screenshots) • [Tech Stack](#-tech-stack) • [Project Structure](#-project-structure) • [Contributing](#-contributing)

</div>

---

## What Is ForensiX?

ForensiX is an autonomous digital forensic analysis platform. You upload a forensic artefact — a memory dump, a Windows executable, a log file — and an AI agent takes over. It identifies the artefact type, selects the right forensic tools, runs them step by step, correlates all findings, and delivers a professional incident report with a timeline and attack hypothesis.

No manual tool selection. No copy-pasting output between tools. No writing reports from scratch.

The system is built for cybersecurity students, researchers, and analysts who want to demonstrate or prototype AI-assisted forensic workflows. It runs entirely in Docker and supports both the Claude API and free local LLMs via Ollama.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Artefact Type Detection** | Automatically classifies uploads using magic byte analysis |
| **Autonomous Tool Selection** | AI decides which forensic tools to run based on artefact type |
| **Multi-Tool Execution** | Runs strings, YARA, Volatility3, and binwalk sequentially |
| **Live Agent Stream** | Terminal-style real-time feed of every agent action over WebSocket |
| **Findings Correlation** | AI cross-references all tool outputs to build the full picture |
| **Incident Timeline** | Chronological sequence of events extracted from evidence |
| **Attack Hypothesis** | Plain-English explanation of what likely happened |
| **Evidence Table** | Findings with source tool and rule-based confidence scores |
| **Suspicious Strings Analysis** | AI flags the most dangerous strings with severity and explanation |
| **PDF Report Export** | Professionally designed report with dark cover, logo, confidence bars |
| **Live AI Mode Toggle** | Switch between Claude API and Ollama from the UI — no restart needed |
| **Dual AI Backend** | Claude API auto-fallback to Ollama when no API key is set |
| **Demo Sample Included** | Bundled `cridex.vmem` memory image with real malware artefacts |
| **Docker Compose Deploy** | One command to run the full stack — no local tool installation |

---

## 🚀 Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- An Anthropic API key **or** [Ollama](https://ollama.ai) installed locally (see [AI Modes](#-ai-modes))

### 1. Clone the repository

```bash
git clone https://github.com/Aamer930/forensix.git
cd forensix
```

### 2. Add your API key

Edit the `.env` file in the project root and replace `sk-ant-your-key-here` with your real key.

Open `.env` and fill in your details:

```env
# Choose your AI backend: "claude" or "ollama"
AI_MODE=ollama   # default — works out of the box with no API key

# Required if AI_MODE=claude
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Required if AI_MODE=ollama
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama3.2
```

> **No API key?** Leave `AI_MODE=ollama` (the default). The Claude mode auto-falls back to Ollama if no valid key is detected.
> You can also switch AI backend live from the Upload page UI — no restart required.

### 3. Demo sample

A synthetic demo sample (`sample/cridex.vmem`) is included in the repository. Click **Load Demo Sample** in the UI — no download needed.

> Or upload your own forensic artefact — memory dumps, PE executables, and log files are all supported.

### 4. Start the stack

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

---

## 🔁 How It Works

```
                        ┌─────────────────────────────────────────┐
                        │              ForensiX Pipeline           │
                        └─────────────────────────────────────────┘

  Upload artefact
        │
        ▼
  ┌─────────────┐      Unsupported type?
  │ FileType    │ ──────────────────────► Error response
  │ Router      │
  └──────┬──────┘
         │ memory_dump / pe_executable / log_file / disk_image
         ▼
  ┌─────────────┐      "Given this file type and these strings,
  │   AI Agent  │       which tools should I run?"
  │  Call #1    │ ◄──── Claude API  or  Ollama (local)
  └──────┬──────┘
         │ ["strings", "yara", "volatility3"]
         ▼
  ┌─────────────────────────────────────────────────────┐
  │                  Tool Executor                       │
  │                                                      │
  │  strings ──► YARA ──► Volatility3 ──► binwalk       │
  │     │           │           │              │         │
  │  filter      rule        pslist +      carved        │
  │  + cap       matches     netscan +     files         │
  │              + meta      cmdline                     │
  └──────────────────────────┬──────────────────────────┘
                             │  All outputs (normalized JSON)
                             ▼
  ┌─────────────┐      "Given these tool outputs,
  │   AI Agent  │       what happened? Build the timeline."
  │  Call #2    │ ◄──── Claude API  or  Ollama (local)
  └──────┬──────┘
         │
         ▼
  ┌──────────────────────────────────────┐
  │  Correlation Result                   │
  │  ├── Incident Timeline                │
  │  ├── Attack Hypothesis                │
  │  ├── Evidence Table + Confidence      │
  │  └── Executive Summary               │
  └──────────────────────────────────────┘
         │
         ▼
  PDF Report  +  Results Page  +  Live Stream (WebSocket)
```

**The AI makes exactly two decisions per analysis run.** Everything else — tool execution, output normalization, confidence scoring, PDF generation — is deterministic Python code. This keeps the system reliable and debuggable.

---

## 🤖 AI Modes

ForensiX supports two interchangeable AI backends. Switch between them by setting `AI_MODE` in your `.env` file, or toggle live from the **Upload page UI** — no restart required.

If `AI_MODE=claude` but no valid API key is set, the system automatically falls back to Ollama.

### Claude API *(Recommended for best quality)*

Uses Anthropic's `claude-sonnet-4-6` model via the cloud API.

```env
AI_MODE=claude
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

- Best reasoning and report quality
- Consistent structured JSON output
- Requires internet connection
- ~$0.01–0.03 per full analysis run
- Get an API key at [console.anthropic.com](https://console.anthropic.com)

### Local Ollama *(Free, offline, no API key)*

Runs an open-source model locally on your machine using [Ollama](https://ollama.ai).

```env
AI_MODE=ollama
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama3.2
```

**Setup:**

```bash
# Install Ollama from https://ollama.ai, then:
ollama pull llama3.2      # ~2GB download
# or
ollama pull mistral       # alternative option
```

- Completely free, unlimited runs
- Works fully offline
- No API key or account required
- Slightly lower output quality than Claude
- Recommended for development, testing, and student use

> Both modes use identical prompts and expect identical output schemas. Switching is instant — no code changes required.

---

## 🛠 Forensic Tools

All tools run inside Docker. Nothing needs to be installed on your host machine.

| Tool | Purpose | Artefact Types |
|------|---------|----------------|
| **strings** | Extract readable text: IPs, URLs, paths, commands | All types |
| **YARA** | Malware signature detection against 8+ rule families | All types |
| **Volatility3** | Memory forensics: processes, network, command lines | Memory dumps |
| **binwalk** | Identify embedded files and binary signatures | Executables, images |

### YARA Rules

ForensiX ships with a bundled ruleset covering:

- Suspicious PE strings and API calls
- Network communication indicators
- Keylogger behavior
- Ransomware patterns
- Zeus / banking trojan signatures
- Generic dropper characteristics
- Credential harvesting tools
- Rootkit indicators

To add your own rules, drop `.yar` files into `backend/yara_rules/`. They are auto-discovered at startup.

---

## 📸 Screenshots

### Upload Page
![alt text](image.png)

### Live Agent Stream
![alt text](image-1.png)

```
forensix@agent:~$ ./run_analysis.sh

◆ [AI]         File identified as memory_dump. Asking AI which tools to run...
◆ [AI]         AI selected tools: strings, yara, volatility3
⟳ [strings]    Running strings...
✓ [strings]    Extracted 487 strings (from 12,043 raw)
⟳ [yara]       Running yara...
✓ [yara]       YARA: 3 rule matches found
⟳ [volatility3] Running volatility3...
✓ [vol_imageinfo] Image info: Windows XP SP2 (x86) [5.1.2600]
✓ [vol_pslist]  Found 15 processes
✓ [vol_netscan] Found 2 network connections
✓ [vol_cmdline] Captured 12 command lines
◆ [AI]         Correlating findings and generating incident report...
★             Analysis complete.
```

### Results Page
![alt text](image-2.png)

![alt text](image-3.png)

### PDF Report
![alt text](image-4.png)

---

## 📁 Project Structure

```
forensix/
│
├── backend/                    # FastAPI backend
│   ├── main.py                 # App entry point
│   ├── models.py               # Pydantic models
│   ├── job_store.py            # In-memory job state + WebSocket events
│   │
│   ├── routers/
│   │   ├── upload.py           # POST /upload, POST /upload-sample
│   │   └── ws.py               # WebSocket /ws/{job_id}
│   │
│   ├── pipeline/
│   │   ├── router.py           # File type detection
│   │   ├── selector.py         # AI Call 1 — tool selection
│   │   ├── executor.py         # Tool execution + event streaming
│   │   ├── correlator.py       # AI Call 2 — findings correlation
│   │   └── confidence.py       # Rule-based confidence scoring
│   │
│   ├── tools/
│   │   ├── strings_tool.py     # strings wrapper
│   │   ├── yara_tool.py        # YARA wrapper
│   │   ├── volatility_tool.py  # Volatility3 wrapper (4 modules)
│   │   ├── volatility_cache.py # Cached cridex.vmem results (demo fallback)
│   │   └── binwalk_tool.py     # binwalk wrapper
│   │
│   ├── report/
│   │   └── pdf_builder.py      # ReportLab PDF generation
│   │
│   ├── yara_rules/
│   │   └── malware_common.yar  # Bundled YARA rules
│   │
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/                   # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Upload.tsx      # Artefact upload page
│   │   │   ├── LiveAgent.tsx   # Real-time agent stream
│   │   │   ├── Results.tsx     # Timeline + evidence
│   │   │   └── Report.tsx      # PDF preview + download
│   │   │
│   │   ├── components/
│   │   │   ├── TerminalStream.tsx
│   │   │   ├── Timeline.tsx
│   │   │   ├── EvidenceTable.tsx
│   │   │   └── ConfidenceBadge.tsx
│   │   │
│   │   └── lib/
│   │       └── api.ts          # API client
│   │
│   ├── Dockerfile
│   └── nginx.conf
│
├── sample/
│   └── cridex.vmem             # Demo memory image (download separately)
│
├── docs/
│   └── ForensiX_Documentation.md
│
├── docker-compose.yml
├── .env
└── CLAUDE.md
```

---

## ⚙️ Configuration

All configuration is done through the `.env` file.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AI_MODE` | Yes | `claude` | AI backend to use: `claude` or `ollama` |
| `ANTHROPIC_API_KEY` | If `AI_MODE=claude` | — | Your Anthropic API key |
| `OLLAMA_BASE_URL` | If `AI_MODE=ollama` | `http://host.docker.internal:11434` | Ollama server URL |
| `OLLAMA_MODEL` | If `AI_MODE=ollama` | `llama3.2` | Model name to use |

---

## 🧪 API Reference

The backend exposes a REST API at `http://localhost:8000`. Interactive docs available at `/docs`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload` | Upload a forensic artefact |
| `POST` | `/api/upload-sample` | Run analysis on the bundled demo sample |
| `GET` | `/api/jobs/{job_id}` | Get job status and results |
| `GET` | `/api/jobs/{job_id}/report` | Download PDF report |
| `GET` | `/api/sample` | Get demo sample metadata |
| `WS` | `/ws/{job_id}` | WebSocket stream for live events |
| `GET` | `/health` | Health check |

### WebSocket Event Types

```json
{ "type": "llm_thinking", "message": "Selecting tools based on file type..." }
{ "type": "step_start",   "tool": "yara",  "message": "Running yara..." }
{ "type": "step_done",    "tool": "yara",  "message": "YARA: 3 rule matches found" }
{ "type": "step_error",   "tool": "yara",  "message": "YARA scan timeout" }
{ "type": "complete",     "message": "Analysis complete.", "data": { "job_id": "..." } }
{ "type": "error",        "message": "Unsupported file type." }
```

---

## 🧰 Development Setup

To run without Docker (useful for fast iteration):

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Install Volatility3
pip install volatility3

export ANTHROPIC_API_KEY=sk-ant-...
export AI_MODE=claude

uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev                    # Starts at http://localhost:5173
```

The Vite dev server proxies `/api` and `/ws` requests to `localhost:8000` automatically.

---

## 🔒 Security Notes

- ForensiX runs forensic tools on uploaded user files. **Do not expose it to the public internet.**
- It is designed for local use, controlled lab environments, and demos only.
- Upload size is capped at 500MB per file.
- All processing happens inside Docker containers.
- No data is stored permanently — job state lives in application memory and is lost on restart.

---

## 🗺 Roadmap

- [ ] Ollama backend integration *(in progress)*
- [ ] LangGraph-based branching agent (conditional tool chains)
- [ ] Persistent job storage with Redis
- [ ] Multi-artefact case management
- [ ] Custom YARA rule upload via UI
- [ ] Streaming AI token output in terminal
- [ ] Additional tools: `exiftool`, `foremost`, PCAP analysis
- [ ] User authentication and case history

---

## 🤝 Contributing

Contributions are welcome. To add a new forensic tool:

1. Create `backend/tools/yourtool_tool.py` following the existing wrapper pattern
2. Return a `ToolOutput` model with `tool`, `success`, `data`, and optional `error`
3. Register the tool name in `pipeline/executor.py::_execute_tool()`
4. Update the tool selection prompt in `pipeline/selector.py`

To add YARA rules, drop `.yar` files into `backend/yara_rules/` — they are auto-loaded at startup.

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## 📚 References

- [Volatility Foundation](https://volatilityfoundation.org) — Memory forensics framework
- [YARA Rules](https://github.com/Yara-Rules/rules) — Open-source malware signature library
- [Anthropic Claude](https://anthropic.com) — Claude API documentation
- [Ollama](https://ollama.ai) — Local LLM runtime
- [cridex.vmem](https://github.com/volatilityfoundation/volatility/wiki/Memory-Samples) — Public domain Windows XP memory sample

---

<div align="center">

Built as a university cybersecurity project.

**ForensiX** — *Autonomous Forensic Agent*

</div>
