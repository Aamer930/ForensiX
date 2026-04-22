# ForensiX — Autonomous Forensic Agent
### Project Documentation

---

## 1. Project Title

**ForensiX — Autonomous Forensic Agent**
*From Artefact to Incident Timeline*

---

## 2. Project Overview

ForensiX is an autonomous digital forensic analysis platform powered by AI. A user uploads a forensic artefact — such as a memory dump, a log file, or a PE executable — and the system takes over from there. It detects the artefact type, decides which forensic tools to run, executes them in sequence, collects and correlates the findings, and produces a professional incident report complete with a timeline, attack hypothesis, and evidence table.

The platform is designed to simulate the decision-making process of an experienced forensic analyst, but running automatically without manual instructions. It demonstrates how artificial intelligence can be applied to cybersecurity workflows to accelerate and standardize forensic investigations.

ForensiX is built as a full-stack web application with a clean modern interface, a Python-based backend, and an AI agent layer that supports both cloud-based and fully local language models. It is modular, demo-friendly, and designed to be understandable for both technical and non-technical audiences.

---

## 3. Problem Statement

Digital forensic investigation is a time-consuming and highly manual process. When a security incident occurs, analysts must:

- Identify what kind of artefact they are working with
- Manually select and run multiple forensic tools
- Interpret and cross-reference results from different tools
- Construct an incident timeline by hand
- Write a detailed report explaining their findings

This process requires significant expertise, takes hours or days, and is prone to human error or missed correlations. Junior analysts especially struggle to know which tools to apply to which artefact and in what order.

There is a clear need for an automated pipeline that can guide the investigation process, reduce the time from artefact to insight, and present findings in a structured and readable format — even when the operator is not a forensic expert.

---

## 4. Proposed Solution

ForensiX addresses this problem by introducing an autonomous agent that acts as an intelligent forensic analyst. Rather than requiring the user to know which tools to run, the system makes that decision automatically based on the type of artefact provided.

The agent:

1. Accepts an uploaded artefact and identifies its type
2. Selects the most appropriate forensic tools to apply
3. Executes each tool and collects structured output
4. Correlates findings across tools to identify patterns and relationships
5. Generates an incident timeline and natural-language attack hypothesis
6. Exports a professional PDF report for documentation and review

The system supports two AI modes: a cloud-based mode using the Claude API for high-quality reasoning, and a fully local mode using Ollama with open-source models for cost-free and offline use. This makes it accessible for both professional demonstrations and student environments.

---

## 5. Project Objectives

- Build a working autonomous agent pipeline that can analyze forensic artefacts end to end
- Implement intelligent artefact-type detection to route inputs to the correct tools
- Wrap multiple forensic tools as structured, callable components
- Use a language model to reason over tool outputs and generate human-readable findings
- Stream the agent's live activity to the user in real time through a terminal-style interface
- Generate a downloadable PDF forensic report from analysis results
- Support both Claude API and local Ollama as interchangeable AI backends
- Deploy the full system using Docker Compose for easy and reproducible setup
- Produce a demo-ready system that can be presented clearly to judges and reviewers

---

## 6. Key Features

**Artefact Upload and Type Detection**
Users upload a forensic artefact through a drag-and-drop interface. The system uses file signature analysis to classify the artefact as a memory dump, PE executable, log file, disk image, or unsupported type. Unsupported artefacts are rejected gracefully with a clear error message.

**Iterative Tool Selection**
The AI agent decides which forensic tool to run at each step, one at a time. After seeing the result of each tool, it decides whether to run another tool or declare the evidence gathering complete. This iterative loop continues for up to 9 decisions (plus entropy = max 10 LLM calls). Every decision is recorded with full reasoning text, visible in the terminal and in the Agent Reasoning Log. If the model fails, a rule-based fallback ensures the pipeline continues reliably.

**Sequential Tool Execution**
Each selected tool runs one at a time. Output from each tool is collected in a normalized, structured format before being passed to the next stage. Tools include strings extraction, YARA malware scanning, Volatility3 memory analysis, and binwalk binary inspection.

**Live Agent Activity Stream**
A terminal-style interface on the frontend shows the user exactly what the agent is doing at every step — which tool is running, what it found, and when it completes. This stream is delivered over WebSocket and replays on reconnect so no events are lost.

**Findings Correlation and Multi-Hypothesis Generation**
After all tools have run, the language model receives the combined structured output and produces an incident timeline, three ranked attack hypotheses in plain English, and a scored evidence table. Confidence scores are assigned using rule-based logic for reliability.

**Agent Reasoning Log**
Every AI tool-selection decision is captured as an `AgentReasoningStep` — including the chosen tool, the reasoning behind it, and a summary of findings so far. These appear live in the terminal as purple THINK steps and are displayed in a collapsible Reasoning Log section on the Results page.

**Multi-Hypothesis Attack Analysis**
Instead of a single hypothesis, the correlator produces three ranked attack scenarios. Each hypothesis has a label (e.g., "Cridex Banking Trojan Infection"), a 2–3 sentence description, and a confidence percentage. The highest-confidence hypothesis is highlighted; all three are displayed side by side.

**Adversary Attribution**
After correlation, observed MITRE tactics and techniques are matched against a built-in lookup table of six known threat actor profiles (APT28/Fancy Bear, Lazarus Group, FIN7, Carbanak, Turla, and Sandworm). If a match meets the minimum confidence threshold, an Adversary Attribution card is displayed showing the actor name, motivation, matched TTPs, confidence score, and analyst notes.

**Evidence-Linked Timeline**
Every timeline event carries a `tool_source` field identifying which forensic tool produced it. Clicking a timeline event opens a slide-out drawer with the full raw output from that tool, allowing investigators to trace each conclusion directly to its source evidence.

**File Entropy Analysis**
Every file is analyzed for Shannon entropy before other tools run. The file is split into ~160 equal blocks and the entropy of each block is calculated (0.0–8.0 scale). Results are displayed as a color-coded bar chart with dashed reference lines at 5.0, 6.5, and 7.2. The overall entropy determines a classification: benign (<5.0), compressed (5.0–6.5), packed (6.5–7.2), or encrypted (≥7.2). High-entropy regions that may indicate packed or encrypted payloads are counted separately.

**Threat Risk Score**
A composite risk score from 0–100 is computed from the correlation results and displayed as an animated radial gauge. The score provides an at-a-glance severity indicator before the user reviews the detailed findings.

**MITRE ATT&CK Heatmap**
An interactive 14-tactic grid maps observed behaviors to the MITRE ATT&CK framework. Each tactic cell lights up when evidence from the timeline matches that tactic. Tactics can be matched by name, ID (TA0002), or common alias. When a timeline event only has a technique ID (e.g., T1059), the system infers the parent tactic automatically using a built-in lookup table.

**Interactive Threat Graph**
A physics-based SVG force-directed graph shows relationships between the analysed sample (center), evidence nodes (inner ring), and IOC nodes (outer ring). Nodes settle into stable positions using a custom simulation loop and can be dragged to explore connections. The graph renders via SVG `viewBox` so it scales correctly at any screen size or DPI — including Mac Retina displays.

**Suspicious Strings Analysis**
After correlation, the AI identifies the most forensically significant strings from the tool outputs — IP addresses, domains, registry keys, API calls, file paths, and commands. Each is flagged with a severity level (Critical, High, Medium, Low) and a plain-English explanation of why it is dangerous. These appear in both the Results page and the PDF report.

**VirusTotal Threat Intelligence**
After correlation, each suspicious string is checked against the VirusTotal API. If any antivirus engine flags the indicator as malicious, the reason text is updated with the detection count and vendor names, and the severity is automatically escalated to Critical.

**Professional PDF Report**
A downloadable PDF report is generated on demand with a professional dark-themed design. It includes a branded cover page with the ForensiX logo and case metadata, executive summary, attack hypothesis, incident timeline, evidence table with visual confidence bars, suspicious strings table with color-coded severity, and a tool output appendix.

**Live AI Backend Toggle**
Users can switch between Claude API and Ollama directly from the Upload page UI without restarting the stack. The current backend is shown as a badge. If Claude mode is selected but no valid API key is present, the system automatically falls back to Ollama.

**Dual AI Backend Support**
The system can run with either the Claude API (cloud-based, best quality) or Ollama (local, free, offline). Users configure their preferred mode through an environment variable or the live UI toggle. Both modes use the same pipeline and produce the same output structure.

**Docker Compose Deployment**
The entire system — backend, frontend, and all forensic tools — runs inside Docker containers. A single `docker compose up` command starts everything with no local tool installation required.

---

## 7. System Workflow

The following steps describe the complete flow from upload to report:

1. The user opens the web application and uploads a forensic artefact, or loads the bundled demo sample.
2. The backend receives the file and assigns it a unique job ID.
3. The file type is detected using magic byte analysis.
4. If the file type is unsupported, the pipeline stops and returns a clear error to the user.
5. **Entropy** analysis always runs first as a mandatory step (no LLM call consumed).
6. The AI agent enters an iterative loop: it receives the current findings and decides which single tool to run next (strings, YARA, Volatility3, or binwalk), or declares the evidence sufficient and stops. This loop repeats up to 9 times. Every decision is logged with the agent's reasoning.
7. Each tool result is normalized into structured JSON and emitted as a real-time WebSocket event.
8. Once the agent declares DONE, the final LLM call correlates all outputs and produces: risk score, MITRE tactics, timeline (with tool sources), three ranked hypotheses, adversary attribution, evidence list, suspicious strings, and executive summary.
9. A rule-based confidence scorer annotates each evidence item with a reliability score.
10. Each suspicious string is checked against the VirusTotal API; malicious detections escalate severity to critical.
11. The results are stored in the job state and made available through the results page.
12. The user can view all nine results sections and download a PDF report.

---

## 8. Agent Decision-Making Flow

The agent operates in two phases per analysis run, with up to 10 total LLM calls.

**Phase 1 — Iterative Tool Selection (up to 9 calls)**

Entropy analysis always runs first with no LLM call. Then the agent enters a loop: it receives the current file type, the list of tools already run, and a summary of findings so far. It returns a single JSON decision: `{"next_tool": "<tool>", "reasoning": "<why>"}`. The agent can choose from strings, YARA, Volatility3, or binwalk — or return `"DONE"` to end the loop. Each decision is recorded as an `AgentReasoningStep` and streamed to the terminal as a purple THINK event.

This loop continues for up to 9 iterations. The agent follows embedded rules (e.g., Volatility3 is only valid for memory dumps). If the model fails or returns an invalid tool, a deterministic fallback runs the next unused tool from a predefined order.

**Phase 2 — Findings Correlation (1 call)**

After the agent declares DONE, all normalized tool outputs are sent in a single prompt. The agent returns a structured JSON object containing: risk score (0–100), MITRE tactics list, incident timeline (each event tagged with `tool_source`), three ranked attack hypotheses (each with label, description, and confidence), evidence list, executive summary, and up to 10 suspicious strings with severity ratings.

After correlation, a rule-based scorer annotates confidence, VirusTotal enriches IOCs, and a TTP-matching function runs adversary attribution against six built-in threat actor profiles.

---

## 9. Tools and Their Role

**entropy**
Calculates the Shannon entropy of every file as a mandatory first step. The file is divided into approximately 160 equal-size blocks (minimum 256 bytes each). Each block's entropy is computed on a 0.0–8.0 scale, where 8.0 represents completely random data. The tool returns the per-block entropy array, the overall file entropy, a classification (benign / compressed / packed / encrypted), a count of high-entropy regions (blocks ≥ 7.0), and the file size. This data feeds the entropy bar chart on the Results page and helps the correlating AI flag files that may contain packed or encrypted payloads.

**strings**
Extracts human-readable text strings from a binary file. Used to identify domain names, IP addresses, file paths, registry keys, command strings, and other indicators of compromise embedded in the artefact. Output is filtered, deduplicated, and capped before being passed to the AI.

**YARA**
Scans the artefact against a library of malware signature rules. Each rule describes patterns associated with known malware families, behaviors, or techniques. When a rule matches, YARA returns the rule name, severity metadata, and matched tags. ForensiX ships with a bundled set of rules covering common malware categories including ransomware, banking trojans, keyloggers, and rootkits.

**Volatility3**
A memory forensics framework used to analyze RAM dumps. ForensiX uses four Volatility3 modules:
- `banners` — detects the operating system version from memory
- `pslist` — lists running processes with PIDs and parent relationships
- `netscan` / `netstat` — lists active and recent network connections
- `cmdline` — captures command-line arguments used to launch each process

Each module runs independently. If one fails, the others continue. If Volatility3 is not available, the system falls back to pre-computed cached results for the bundled demo sample.

**binwalk**
Scans binary files for embedded content by detecting magic byte signatures at different offsets. Used to identify carved files, firmware components, compressed archives, or executable segments hidden within a larger binary. Output is a list of identified embedded file types and their byte offsets.

**file (via python-magic)**
Used internally for artefact type detection at the start of the pipeline. Not run as a user-visible tool — its output is used to route the artefact to the correct tool chain.

---

## 10. Technology Stack

**Backend**
- Python 3.11
- FastAPI — REST API and WebSocket server
- python-magic — file type detection
- yara-python — YARA rule execution
- Volatility3 — memory forensics
- aiofiles — async file I/O
- ReportLab — PDF generation

**AI / Agent Layer**
- Custom pipeline orchestrator (sequential, async)
- Anthropic SDK — for Claude API mode
- Ollama HTTP client — for local LLM mode
- Both modes use the same prompt structure and output schema

**Frontend**
- React 18 with TypeScript
- Vite — build tool and dev server
- Tailwind CSS — styling
- React Router — client-side navigation
- Native WebSocket API — live agent stream

**Deployment**
- Docker and Docker Compose
- Nginx — frontend static file serving and reverse proxy
- Linux base image (Debian slim) — all forensic tools installed at build time

---

## 11. AI Model Options

ForensiX supports two AI backends. The active mode is selected through an environment variable (`AI_MODE=claude` or `AI_MODE=ollama`). Both modes use the same pipeline code and produce identically structured outputs.

### Claude API

Claude is Anthropic's cloud-based language model. It provides strong reasoning quality, follows structured output instructions reliably, and handles complex tool output well.

- Requires an Anthropic API key (`ANTHROPIC_API_KEY`)
- Uses the `claude-sonnet-4-6` model
- Recommended for best demonstration quality
- Costs approximately $0.01–0.03 per full analysis run
- Requires an internet connection

This mode is ideal when presenting to judges or reviewers where output quality matters most.

### Local Ollama

Ollama is a tool for running open-source language models locally on your machine. ForensiX supports Ollama as a drop-in replacement for the Claude API, using the same prompt templates and output schemas.

- No API key required
- Fully offline — works without internet access
- Free to use with no usage limits
- Recommended models: `llama3.2` or `mistral`
- Requires Ollama installed and a model pulled locally
- Reasoning quality is slightly lower than Claude but sufficient for demonstration and development

This mode is ideal for student projects, local development, cost-free usage, and environments without internet access. The system is designed so that switching between modes requires only changing one environment variable — no code changes needed.

---

## 12. System Architecture Overview

ForensiX is organized into three layers:

**Frontend Layer**
A React single-page application served by Nginx. The user interacts through four pages: upload, live agent stream, results, and report. The frontend communicates with the backend through REST API calls and a WebSocket connection. All WebSocket events are buffered on the server side, so a page refresh or reconnect will replay the full event history without losing any agent output.

**Backend Layer**
A FastAPI application that handles file uploads, manages job state, runs the forensic pipeline as a background task, and serves the PDF report. Job state is kept in memory as a dictionary keyed by job ID. Each job stores its status, tool outputs, correlation results, and the full WebSocket event history.

**Agent Pipeline**
A sequential async pipeline that runs inside the backend process:
1. `FileTypeRouter` — classifies the artefact
2. `ToolExecutor` — runs entropy (mandatory), then enters iterative agent loop
3. `ToolSelector` — called once per loop iteration; AI decides next tool or DONE
4. `Correlator` — final AI call; correlates all outputs, produces 3 hypotheses
5. `ConfidenceScorer` — applies rule-based confidence scores
6. `AdversaryProfiler` — matches TTPs to known threat actor profiles
7. `VTClient` — enriches suspicious IOCs via VirusTotal
8. `PDFBuilder` — generates the report on demand

The AI is involved in stages 3 (multiple times) and 4 (once). All other stages are deterministic Python logic.

```
[Browser]
    │  REST + WebSocket
    ▼
[FastAPI Backend]
    │
    ├── Upload → FileTypeRouter → JobStore
    │
    └── Pipeline (background task)
            ├── entropy         (always first, no LLM call)
            │
            ├── Agent Loop ×N  ←── AI (1 call per step, max 9)
            │     ├── selector: {"next_tool": "...", "reasoning": "..."}
            │     ├── _emit_reason → AgentReasoningStep + llm_reason WS event
            │     └── execute tool → collect output → repeat
            │
            ├── Correlator      ←── AI (final call)
            │     └── produces: risk_score, mitre_tactics, timeline,
            │                   hypotheses×3, evidence, suspicious_strings,
            │                   summary, tool_source per event
            │
            ├── ConfidenceScorer
            ├── AdversaryProfiler (TTP lookup → AdversaryProfile)
            ├── VirusTotalClient  (IOC enrichment)
            └── PDFBuilder (on demand)
```

---

## 13. Main User Screens / Pages

**Upload Page**
The entry point to the application. Contains a drag-and-drop upload zone that accepts any file type up to 500MB. A "Load Demo Sample" button loads the pre-bundled `cridex.vmem` memory image for demonstration purposes without requiring the user to have their own artefact. After upload, the user is automatically redirected to the live agent page.

**Live Agent Page**
Displays a terminal-style interface that streams the agent's activity in real time. Each event is color-coded: yellow for a tool starting, green for success, red for errors, and blue for AI reasoning steps. A progress bar shows how many tools have completed. An active tool indicator shows which tool is currently running. If the analysis completes successfully, the user is automatically redirected to the results page.

**Results Page**
Displays the full analysis output in these sections (in order):

1. **Threat Risk Score + Attack Hypotheses** — animated radial gauge (0–100) beside three ranked hypotheses with confidence bars
2. **File Entropy Analysis** — color-coded SVG bar chart of per-block entropy with classification badge and stat cards
3. **MITRE ATT&CK Coverage** — interactive 14-tactic heatmap; tactic cells highlight on evidence match
4. **Adversary Attribution** — threat actor card (name, motivation, matched TTPs, confidence) — shown if a match is found
5. **Executive Summary** — AI-generated one-paragraph overview
6. **Incident Timeline** — chronological list of events; click any event to open a slide-out drawer with the raw tool output
7. **Interactive Threat Graph** — physics-based force graph linking sample → evidence → IOC nodes; drag to explore
8. **Evidence Table** — all findings with source tool and confidence percentage
9. **Suspicious Strings** — up to 10 IOC strings with severity badges (critical/high/medium/low) and VirusTotal annotation
10. **Tool Execution Grid** — per-tool success/failure status cards
11. **Agent Reasoning Log** — collapsible log of every AI decision with chosen tool, reasoning, and running findings summary

An "Export PDF" button generates the downloadable report. A "← New" button returns to the upload page.

**Report Page**
Embeds the generated PDF report in an inline preview. A download button allows the user to save the report locally. The PDF is generated on demand when this page is first loaded.

---

## 14. Input and Output

**Accepted Inputs**
- Raw memory dumps (`.vmem`, `.lime`, `.raw`, `.dmp`)
- Windows PE executables (`.exe`, `.dll`)
- Log files (`.log`, `.txt`)
- Disk images (`.iso`, `.img`)
- Any binary file (analyzed with strings and YARA as a fallback)

**Rejected Inputs**
Files that cannot be classified into a supported type are rejected at the file type routing stage. The user receives a clear error message explaining that the file type is not supported. The pipeline does not attempt partial analysis on unrecognized files.

**Output**
- Live WebSocket event stream (tool steps, AI reasoning, progress)
- Structured JSON job result (accessible via REST API)
- Incident timeline (list of timestamped events)
- Attack hypothesis (plain English paragraph)
- Evidence table (finding, source tool, confidence percentage)
- Executive summary (one paragraph)
- Downloadable PDF forensic report

---

## 15. Findings Correlation and Timeline Generation

After all tools have completed, the agent receives a combined, capped version of all tool outputs in a single structured prompt. The cap limits ensure the total token usage remains reasonable and prevents large tool outputs from degrading the AI's reasoning quality.

The AI is asked to produce eight outputs simultaneously:

- **Risk score**: an integer 0–100 representing the composite threat level
- **MITRE tactics**: a list of MITRE ATT&CK tactic names observed across the timeline
- **Timeline**: a list of events ordered chronologically, each with a timestamp, plain-English description, optional MITRE tactic/technique fields, and a `tool_source` field identifying which forensic tool produced this event
- **Hypotheses**: three ranked attack scenarios, each with a `label` (short name), `description` (2–3 sentences), and `confidence` (0–100)
- **Hypothesis**: the top-ranked hypothesis as a standalone paragraph (backward compatibility)
- **Evidence list**: individual findings, each tagged with the source tool that produced it
- **Summary**: a single paragraph suitable for an executive audience
- **Suspicious strings**: up to 10 IOC strings each with `value`, `severity` (critical/high/medium/low), and `reason`

Confidence scores are not generated by the AI. Instead, a rule-based scorer in `pipeline/confidence.py` applies fixed score ranges based on the evidence source and type. For example, a YARA rule match receives a score of 90%, an external network connection detected by Volatility3 receives 80%, and a suspicious process name receives 75%.

After correlation, each suspicious string is sent to the VirusTotal API. If any engine flags it as malicious, the reason text is enriched with the detection count and top vendor names, and the severity is overridden to "critical". This step is optional — if no `VT_API_KEY` is configured the step is silently skipped.

MITRE tactic extraction has a fallback layer: when the AI returns a timeline event with `mitre_tactic: null` but a valid `mitre_technique` (e.g., `T1059`), both the backend and frontend apply a built-in technique→tactic lookup table to infer the parent tactic. This ensures the heatmap fills correctly even when local models omit the tactic field.

---

## 16. Report Generation

The PDF report is generated using ReportLab, a Python library for programmatic PDF creation. The report is built entirely in-memory and served directly to the browser as a downloadable file — no temporary files are written to disk.

The report contains the following sections:

- **Cover page**: ForensiX branding, case ID, artefact filename, file type, analysis date, and status
- **Executive Summary**: the AI-generated one-paragraph summary
- **Attack Hypothesis**: the full hypothesis text
- **Incident Timeline**: a formatted table of timestamped events
- **Evidence Table**: findings with source tool and confidence percentage
- **Appendix**: truncated preview of raw tool outputs for reference

The report uses a dark-accent professional color scheme consistent with the web interface. Header and footer metadata (report label, page number) appear on every page.

---

## 17. Demo Scenario

The following scenario demonstrates the complete system in under five minutes:

1. Open the application at `http://localhost:3000`
2. Click "Load Demo Sample" to load the bundled `cridex.vmem` Windows XP memory image
3. Watch the live agent terminal stream as the system:
   - Identifies the file as a memory dump
   - Asks the AI which tools to run (strings, YARA, Volatility3)
   - Runs each tool and reports findings in real time
   - Passes all results to the AI for correlation
4. The terminal shows the agent detecting:
   - Suspicious network connections to external IPs on port 8080
   - A suspicious process (`reader_sl.exe`) spawned by Adobe Reader
   - YARA matches for banking trojan behavior indicators
5. The system redirects to the Results page, showing:
   - Hypothesis: the system was likely infected with the Cridex banking trojan via a malicious PDF
   - Timeline: process creation, network connection, and data exfiltration events
   - Evidence table with confidence scores
6. Click "Download PDF" to export the complete forensic report

The `cridex.vmem` sample is a publicly available Windows XP SP2 memory image used by the Volatility project for testing. It contains real malware artifacts suitable for a convincing demonstration. If Volatility3 cannot parse the image during the demo, the system automatically uses pre-computed cached results to ensure the demo always completes successfully.

---

## 18. Implementation Plan / Development Phases

**Phase 1 — Backend Foundation**
Set up the FastAPI project, file upload endpoint, job state management, WebSocket endpoint, and file type routing. This phase establishes the backbone of the system before any tool or AI integration.

**Phase 2 — Tool Wrappers**
Implement each forensic tool as a structured Python module. Each wrapper runs the tool via subprocess or Python bindings, captures the output, applies size caps and normalization, and returns a `ToolOutput` Pydantic model. Tools: strings, YARA, Volatility3 (four modules), binwalk.

**Phase 3 — Agent Pipeline**
Implement the tool selector, tool executor, correlator, and confidence scorer. Wire the pipeline into the background task system so it runs automatically after upload. Connect the executor to the WebSocket event stream.

**Phase 4 — Dual AI Backend**
Implement both the Claude API client and the Ollama HTTP client behind a shared interface. The active backend is selected via environment variable. Both clients use identical prompt templates and expect identical output schemas.

**Phase 5 — PDF Report**
Implement the ReportLab-based PDF builder covering all report sections. Wire the download endpoint to generate and stream the PDF on demand.

**Phase 6 — Frontend**
Build the four-page React application: upload, live agent, results, and report. Implement the WebSocket client with reconnect and event replay. Style using Tailwind CSS.

**Phase 7 — Docker Compose and Integration**
Write the Dockerfiles for backend and frontend. Configure Docker Compose with volume mounts for uploads and the sample artefact. Verify full end-to-end flow inside containers.

**Phase 8 — Demo Hardening**
Run the full demo scenario with `cridex.vmem`. Add the Volatility3 cached fallback. Test all error paths including unsupported files, tool timeouts, and AI backend failures. Final UI polish.

---

## 19. Risks and Limitations

**Volatility3 Image Compatibility**
Volatility3 requires a recognized OS profile to function correctly. Memory images from uncommon operating systems or custom configurations may fail to parse. This is mitigated by running image detection first and falling back to cached results for the demo sample if the profile is unrecognized.

**AI Output Quality**
The correlation quality depends on the language model in use. The Claude API consistently produces well-structured, accurate hypotheses. Local Ollama models may produce lower-quality or occasionally malformed JSON output. The system includes retry logic and falls back to default values if the AI response cannot be parsed.

**Token Budget**
Large tool outputs — particularly from strings on a big binary — can exceed the token budget of the AI prompt. This is addressed by capping each tool's output before it reaches the AI. The cap values are tuned to keep total prompt size within safe limits for both Claude and Ollama models.

**Performance**
Volatility3 is slow, sometimes taking 60–120 seconds per module on large memory images. The system enforces per-tool timeouts and runs tools sequentially rather than in parallel to keep resource usage predictable. Binwalk is optional and skipped for most artefact types.

**Security**
The system runs forensic tools directly on uploaded user files. In a production setting this would require sandboxing and strict access controls. The current implementation is designed for local or controlled demo environments only and should not be exposed to the public internet.

**In-Memory Job State**
Job results are stored in application memory and are lost when the backend restarts. This is acceptable for demo use but would need a persistent store (Redis, database) for any real deployment.

---

## 20. Future Improvements

**Persistent Storage**
A lightweight SQLite backend (`db.py`) is used to save completed cases to disk. Full Redis or database-backed job management with query history and case browsing is a planned extension.

**Additional Forensic Tools**
Integrate tools such as `exiftool` for metadata extraction, `foremost` for file carving, `Autopsy` for disk image analysis, or `Suricata` for PCAP analysis. Each new tool would be added as an independent module following the existing wrapper pattern.

**Multi-Artefact Cases**
Allow users to upload multiple artefacts under a single case ID. The agent would correlate findings across all artefacts to build a more complete incident picture.

**LangGraph Orchestration**
Replace the current sequential pipeline with a LangGraph-based graph to enable branching logic — for example, conditionally running a deeper Volatility scan if a suspicious process is found by pslist. This would bring the agent closer to true autonomous multi-step reasoning.

**User Accounts and Case Management**
Add authentication and a case dashboard so multiple users can manage separate investigations, annotate findings, and share reports.

**Streaming AI Responses**
Stream the AI's reasoning token by token into the terminal interface rather than waiting for the full response. This would improve the perceived responsiveness of the live agent view.

**YARA Rule Manager**
Add a UI panel for uploading and managing custom YARA rule sets without requiring a container rebuild.

---

## 21. Conclusion

ForensiX demonstrates how artificial intelligence can be applied to digital forensic workflows to make investigations faster, more consistent, and more accessible. By automating the tool selection, execution, and correlation stages of a forensic investigation, the system removes the need for deep technical expertise to get useful results from standard forensic artefacts.

The platform is built with practical demo use in mind: it runs entirely in Docker with no local tool installation required, supports both paid and free AI backends, includes a pre-packaged demo artefact with a known malware infection, and produces clear visual and PDF outputs that communicate findings to both technical and non-technical audiences.

From an academic perspective, ForensiX integrates concepts from cybersecurity, operating systems, AI reasoning, and full-stack software engineering into a single working system. It is a practical illustration of how autonomous agents can be applied to real security problems — not as a theoretical exercise, but as a running, demonstrable product.

The system is intentionally modular and extensible. New forensic tools can be added as independent modules, the AI backend can be swapped without changing pipeline logic, and the reporting layer is decoupled from the analysis pipeline. This design makes ForensiX a strong foundation for future work in automated threat analysis and AI-assisted incident response.

---

*Document Version: 3.0*
*Project: ForensiX — Autonomous Forensic Agent*
*Type: University Project Documentation*

---

**Team:** Ahmed Aamer · Youssef Hazem · Mohamed Ahmed · Ali Hesham

**Supervisor:** Dr. Mohamed Hamhme

**Institution:** Arab Academy for Science, Technology and Maritime Transport

**Faculty / Major:** Computer Science — Cyber Security
