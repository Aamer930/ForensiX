import os
import requests
import random

VT_API_KEY = os.environ.get("VT_API_KEY")

def check_indicator(indicator: str) -> dict:
    """
    Query VirusTotal API for an IP or Hash.
    Falls back to a mock engine if no API key is set.
    """
    if not VT_API_KEY:
        # Mock mode for Demo
        score = random.choice([0, 14, 55, 68])
        if score == 0:
            return {"malicious": 0, "total": 90, "vendors": []}
        vendors = ["Kaspersky", "CrowdStrike", "Symantec", "Palo Alto"]
        return {"malicious": score, "total": 90, "vendors": random.sample(vendors, k=2)}

    # Real mode
    url = f"https://www.virustotal.com/api/v3/search?query={indicator}"
    headers = {"x-apikey": VT_API_KEY}
    try:
        r = requests.get(url, headers=headers, timeout=5)
        if r.status_code == 200:
            data = r.json()
            if data.get("data"):
                stats = data["data"][0]["attributes"]["last_analysis_stats"]
                return {
                    "malicious": stats.get("malicious", 0),
                    "total": sum(stats.values()),
                    "vendors": ["VirusTotal"]
                }
    except Exception:
        pass
    return {"malicious": 0, "total": 0, "vendors": []}
