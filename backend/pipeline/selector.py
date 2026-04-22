import json
import re
from models import FileType, ToolOutput
from pipeline import llm_client

_SYSTEM = """You are an autonomous forensic agent. You must decide the NEXT SINGLE tool to run based on the file type and findings so far.
Available tools: ["strings", "yara", "volatility3", "binwalk"]
Rules:
- Return ONLY valid JSON, no markdown, no explanation.
- Only use 'volatility3' for memory_dump files.
- If you have gathered enough evidence to form an attack hypothesis and timeline, return "DONE" as the next_tool.
- Do not recommend a tool that has already been run.
Schema: {"next_tool": "<tool_name_or_DONE>", "reasoning": "<why you chose this step>"}
Example: {"next_tool": "strings", "reasoning": "I need to extract readable text to identify basic indicators."}"""

def get_next_tool(file_type: FileType, tool_outputs: list[ToolOutput]) -> dict:
    run_tools = [o.tool for o in tool_outputs]
    # De-duplicate: vol_pslist, vol_netscan etc. all count as "volatility3"
    run_base = set()
    for t in run_tools:
        if t.startswith("vol_"):
            run_base.add("volatility3")
        else:
            run_base.add(t)
    
    # Simple capping for prompt size
    summarized_findings = []
    for o in tool_outputs:
        if o.success:
            summarized_findings.append(f"[{o.tool}] Success. Data summary: {str(o.data)[:300]}")
        else:
            summarized_findings.append(f"[{o.tool}] Failed: {o.error}")
            
    findings_text = "\n".join(summarized_findings) if summarized_findings else "(no tools run yet)"
    
    user_msg = f"file_type={file_type.value}\ntools_already_run={list(run_base)}\nfindings_so_far:\n{findings_text}\n\nWhat is the next tool?"

    for attempt in range(3):
        try:
            text = llm_client.call(_SYSTEM, user_msg, max_tokens=256)
            # Clean markdown fences
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]

            text = text.strip()
            
            # Try to extract JSON object
            match = re.search(r'\{[^{}]*\}', text)
            if match:
                text = match.group(0)
            
            # Remove trailing commas
            text = re.sub(r',\s*}', '}', text)
            
            data = json.loads(text)
            next_tool = data.get("next_tool", "").strip()
            
            valid = {"strings", "yara", "volatility3", "binwalk", "DONE"}
            if next_tool in valid:
                if next_tool == "volatility3" and file_type != FileType.memory_dump:
                    print(f"[selector] LLM chose volatility3 but file is {file_type.value}. Rejecting.")
                    continue
                return data
        except Exception as e:
            print(f"[selector] Attempt {attempt+1} failed: {e}")
            continue

    # Deterministic fallback — guaranteed to work
    if file_type == FileType.memory_dump:
        order = ["strings", "yara", "volatility3"]
    else:
        order = ["strings", "yara", "binwalk"]
    
    for tool in order:
        if tool not in run_base:
            return {"next_tool": tool, "reasoning": f"Deterministic fallback: Running {tool}."}
    
    return {"next_tool": "DONE", "reasoning": "Deterministic fallback: All tools completed."}
