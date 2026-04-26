import Evtx.Evtx as evtx
import Evtx.Views as e_views
import xml.etree.ElementTree as ET
from models import ToolOutput

# High-signal Event IDs and their MITRE mappings
_HIGH_SIGNAL = {
    4688: {"desc": "Process Creation", "technique": "T1059", "tactic": "Execution"},
    4624: {"desc": "Successful Logon", "technique": "T1078", "tactic": "Initial Access"},
    4625: {"desc": "Failed Logon", "technique": "T1110", "tactic": "Credential Access"},
    4648: {"desc": "Logon with Explicit Credentials", "technique": "T1550", "tactic": "Lateral Movement"},
    4672: {"desc": "Special Privileges Assigned", "technique": "T1134", "tactic": "Privilege Escalation"},
    4697: {"desc": "Service Installed", "technique": "T1543.003", "tactic": "Persistence"},
    7045: {"desc": "New Service Installed", "technique": "T1543.003", "tactic": "Persistence"},
    7036: {"desc": "Service State Change", "technique": "T1543", "tactic": "Persistence"},
    1102: {"desc": "Audit Log Cleared", "technique": "T1070.001", "tactic": "Defense Evasion"},
    4698: {"desc": "Scheduled Task Created", "technique": "T1053.005", "tactic": "Persistence"},
    4720: {"desc": "User Account Created", "technique": "T1136", "tactic": "Persistence"},
    4732: {"desc": "Member Added to Security Group", "technique": "T1098", "tactic": "Persistence"},
}


def _parse_event(xml_str: str) -> dict | None:
    try:
        root = ET.fromstring(xml_str)
        ns = {"e": "http://schemas.microsoft.com/win/2004/08/events/event"}

        system = root.find("e:System", ns)
        if system is None:
            return None

        event_id_el = system.find("e:EventID", ns)
        if event_id_el is None or event_id_el.text is None:
            return None
        event_id = int(event_id_el.text.strip())

        time_el = system.find("e:TimeCreated", ns)
        timestamp = time_el.get("SystemTime", "") if time_el is not None else ""

        computer_el = system.find("e:Computer", ns)
        computer = computer_el.text.strip() if computer_el is not None and computer_el.text else ""

        # Extract EventData fields
        event_data = {}
        event_data_el = root.find("e:EventData", ns)
        if event_data_el is not None:
            for data in event_data_el.findall("e:Data", ns):
                name = data.get("Name", "")
                value = data.text or ""
                if name:
                    event_data[name] = value.strip()

        return {
            "event_id": event_id,
            "timestamp": timestamp,
            "computer": computer,
            "data": event_data,
        }
    except Exception:
        return None


def run_evtx(file_path: str) -> ToolOutput:
    try:
        events = []
        all_event_ids: dict[int, int] = {}
        skipped_records = 0

        with evtx.Evtx(file_path) as log:
            for record in log.records():
                try:
                    xml_str = record.xml()
                    parsed = _parse_event(xml_str)
                    if parsed is None:
                        skipped_records += 1
                        continue

                    eid = parsed["event_id"]
                    all_event_ids[eid] = all_event_ids.get(eid, 0) + 1

                    # Only keep high-signal events
                    if eid in _HIGH_SIGNAL:
                        meta = _HIGH_SIGNAL[eid]
                        entry = {
                            "event_id": eid,
                            "timestamp": parsed["timestamp"],
                            "description": meta["desc"],
                            "technique": meta["technique"],
                            "tactic": meta["tactic"],
                            "computer": parsed["computer"],
                        }
                        # Add key fields per event type
                        d = parsed["data"]
                        if eid == 4688:
                            entry["process"] = d.get("NewProcessName", "")
                            entry["cmdline"] = d.get("CommandLine", "")
                            entry["user"] = d.get("SubjectUserName", "")
                        elif eid in (4624, 4625, 4648):
                            entry["user"] = d.get("TargetUserName", "")
                            entry["logon_type"] = d.get("LogonType", "")
                            entry["source_ip"] = d.get("IpAddress", "")
                        elif eid in (7045, 4697):
                            entry["service_name"] = d.get("ServiceName", "")
                            entry["image_path"] = d.get("ImagePath", "") or d.get("ServiceFileName", "")
                        elif eid == 4698:
                            entry["task_name"] = d.get("TaskName", "")

                        events.append(entry)
                        if len(events) >= 200:  # cap to 200 high-signal events
                            break
                except Exception:
                    skipped_records += 1
                    continue

        # Top event IDs by frequency
        top_event_ids = sorted(all_event_ids.items(), key=lambda x: x[1], reverse=True)[:15]

        return ToolOutput(
            tool="evtx",
            success=True,
            data={
                "events": events,
                "event_count": len(events),
                "top_event_ids": [{"event_id": eid, "count": cnt} for eid, cnt in top_event_ids],
                "total_records_scanned": sum(all_event_ids.values()),
                "skipped_records": skipped_records,
            }
        )
    except Exception as e:
        return ToolOutput(tool="evtx", success=False, data={}, error=str(e))
