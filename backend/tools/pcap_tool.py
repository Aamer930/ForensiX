import subprocess
from models import ToolOutput


def run_pcap(file_path: str) -> ToolOutput:
    try:
        # Extract DNS queries
        dns_result = subprocess.run(
            ["tshark", "-r", file_path, "-Y", "dns.qry.name", "-T", "fields", "-e", "dns.qry.name"],
            capture_output=True, text=True, timeout=60
        )
        dns_queries = [q.strip() for q in dns_result.stdout.splitlines() if q.strip()]
        # Deduplicate and take top 50
        dns_queries = list(dict.fromkeys(dns_queries))[:50]

        # Extract HTTP hosts and URIs
        http_result = subprocess.run(
            ["tshark", "-r", file_path, "-Y", "http.request", "-T", "fields",
             "-e", "http.host", "-e", "http.request.uri"],
            capture_output=True, text=True, timeout=60
        )
        http_entries = []
        for line in http_result.stdout.splitlines():
            parts = line.strip().split("\t")
            if len(parts) >= 2 and parts[0].strip():
                http_entries.append({"host": parts[0].strip(), "uri": parts[1].strip()})
            elif parts and parts[0].strip():
                http_entries.append({"host": parts[0].strip(), "uri": ""})
        http_entries = http_entries[:30]

        # Extract top communicating IPs
        ip_result = subprocess.run(
            ["tshark", "-r", file_path, "-T", "fields", "-e", "ip.src", "-e", "ip.dst"],
            capture_output=True, text=True, timeout=60
        )
        ip_counts: dict[str, int] = {}
        for line in ip_result.stdout.splitlines():
            parts = line.strip().split("\t")
            for ip in parts:
                ip = ip.strip()
                if ip:
                    ip_counts[ip] = ip_counts.get(ip, 0) + 1
        top_ips = sorted(ip_counts.items(), key=lambda x: x[1], reverse=True)[:20]
        top_ips_list = [{"ip": ip, "packets": count} for ip, count in top_ips]

        return ToolOutput(
            tool="pcap",
            success=True,
            data={
                "dns_queries": dns_queries,
                "http_requests": http_entries,
                "top_ips": top_ips_list,
                "dns_count": len(dns_queries),
                "http_count": len(http_entries),
                "unique_ips": len(ip_counts),
            }
        )
    except FileNotFoundError:
        return ToolOutput(tool="pcap", success=False, data={}, error="tshark not found — install wireshark-common")
    except subprocess.TimeoutExpired:
        return ToolOutput(tool="pcap", success=False, data={}, error="tshark timed out")
    except Exception as e:
        return ToolOutput(tool="pcap", success=False, data={}, error=str(e))
