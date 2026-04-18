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

**Autonomous Tool Selection**
The AI agent receives the artefact type and a sample of extracted strings, then decides which forensic tools to run and in what order. This decision is made by the language model, not hardcoded rules. If the model's choice is invalid or fails, a rule-based fallback ensures the pipeline continues reliably.

**Sequential Tool Execution**
Each selected tool runs one at a time. Output from each tool is collected in a normalized, structured format before being passed to the next stage. Tools include strings extraction, YARA malware scanning, Volatility3 memory analysis, and binwalk binary inspection.

**Live Agent Activity Stream**
A terminal-style interface on the frontend shows the user exactly what the agent is doing at every step — which tool is running, what it found, and when it completes. This stream is delivered over WebSocket and replays on reconnect so no events are lost.

**Findings Correlation and Hypothesis Generation**
After all tools have run, the language model receives the combined structured output and produces an incident timeline, an attack hypothesis in plain English, and a scored evidence table. Confidence scores are assigned using rule-based logic for reliability.

**Suspicious Strings Analysis**
After correlation, the AI identifies the most forensically significant strings from the tool outputs — IP addresses, domains, registry keys, API calls, file paths, and commands. Each is flagged with a severity level (Critical, High, Medium, Low) and a plain-English explanation of why it is dangerous. These appear in both the Results page and the PDF report.

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
5. A quick strings extraction is run to collect a sample for the AI to reason over.
6. The AI agent (Claude or Ollama) receives the file type and strings sample and returns an ordered list of tools to run.
7. The agent executes each tool in sequence. Each result is normalized into a structured JSON format and emitted as a real-time event over WebSocket.
8. Once all tools have completed, the AI agent receives the combined output and produces the correlation report: timeline, hypothesis, and evidence.
9. A rule-based confidence scorer annotates each evidence item with a reliability score.
10. The results are stored in the job state and made available through the results page.
11. The user can view the full results and download a PDF report.

---

## 8. Agent Decision-Making Flow

The agent makes two intelligent decisions during each analysis run:

**Decision 1 — Tool Selection**

The agent is given the artefact type and a sample of extracted strings. It is asked to return an ordered JSON list of which tools to run. The available tools are strings, YARA, Volatility3, and binwalk. The agent follows built-in rules embedded in the prompt — for example, Volatility3 is only suggested for memory dumps. If the model returns an invalid or empty list, the system falls back to a predefined default set based on file type.

**Decision 2 — Findings Correlation**

After all tools have run, the agent receives all normalized tool outputs in a single prompt. It is asked to return a structured JSON object containing the incident timeline, attack hypothesis, evidence list, executive summary, and a list of up to 10 suspicious strings — each with a severity rating and plain-English explanation. The output schema is strictly defined to ensure the frontend can render it reliably regardless of which AI backend is in use.

This two-call architecture keeps the AI's role focused and predictable — one decision per stage — rather than using a complex multi-step reasoning loop that is harder to debug or demo reliably.

---

## 9. Tools and Their Role

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
2. `ToolSelector` — asks the AI which tools to run
3. `ToolExecutor` — runs each tool, emits WebSocket events
4. `Correlator` — asks the AI to correlate all outputs
5. `ConfidenceScorer` — applies rule-based confidence scores
6. `PDFBuilder` — generates the report on demand

Each stage is a separate module with a single responsibility. The AI is involved only in stages 2 and 4 — all other stages are deterministic Python logic.

```
[Browser]
    │  REST + WebSocket
    ▼
[FastAPI Backend]
    │
    ├── Upload → FileTypeRouter → JobStore
    │
    └── Pipeline (background task)
            ├── ToolSelector    ←── AI (Call 1)
            ├── ToolExecutor
            │     ├── strings
            │     ├── YARA
            │     ├── Volatility3
            │     └── binwalk
            ├── Correlator      ←── AI (Call 2)
            ├── ConfidenceScorer
            └── PDFBuilder (on demand)
```

---

## 13. Main User Screens / Pages

**Upload Page**
The entry point to the application. Contains a drag-and-drop upload zone that accepts any file type up to 500MB. A "Load Demo Sample" button loads the pre-bundled `cridex.vmem` memory image for demonstration purposes without requiring the user to have their own artefact. After upload, the user is automatically redirected to the live agent page.

**Live Agent Page**
Displays a terminal-style interface that streams the agent's activity in real time. Each event is color-coded: yellow for a tool starting, green for success, red for errors, and blue for AI reasoning steps. A progress bar shows how many tools have completed. An active tool indicator shows which tool is currently running. If the analysis completes successfully, the user is automatically redirected to the results page.

**Results Page**
Displays the full analysis output in four sections: the attack hypothesis card, the incident timeline, the evidence table with confidence badges, and a tool execution summary grid. A "Download PDF" button links to the report page. A "New Analysis" button returns to the upload page.

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

The AI is asked to produce four outputs simultaneously:

- **Timeline**: a list of events ordered chronologically, each with a timestamp (or "Unknown" if no timestamp is available) and a plain-English description of what happened.
- **Hypothesis**: a 2–4 sentence paragraph explaining the most likely attack scenario based on the combined evidence.
- **Evidence list**: individual findings, each tagged with the source tool that produced it.
- **Summary**: a single paragraph suitable for an executive audience.

Confidence scores are not generated by the AI. Instead, a rule-based scorer in `pipeline/confidence.py` applies fixed score ranges based on the evidence source and type. For example, a YARA rule match receives a score of 90%, an external network connection detected by Volatility3 receives 80%, and a suspicious process name receives 75%. This approach is more reliable and consistent than asking the AI to invent percentages.

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
Replace in-memory job state with a Redis or SQLite backend so jobs survive server restarts and can be queried historically.

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

*Document Version: 1.0*
*Project: ForensiX — Autonomous Forensic Agent*
*Type: University Project Documentation*
