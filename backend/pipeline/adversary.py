from models import AdversaryProfile, CorrelationResult

_PROFILES = [
    {
        "name": "APT28 / Fancy Bear",
        "motivation": "Espionage (nation-state, Russia)",
        "required_tactics": {"Credential Access", "Lateral Movement", "Exfiltration"},
        "optional_tactics": {"Initial Access", "Defense Evasion", "Command and Control"},
        "techniques": ["T1003", "T1021", "T1041", "T1566", "T1027"],
        "notes": "Favors credential dumping and lateral movement. Known for targeting government and military.",
    },
    {
        "name": "Lazarus Group",
        "motivation": "Financial gain / Espionage (nation-state, North Korea)",
        "required_tactics": {"Execution", "Command and Control", "Impact"},
        "optional_tactics": {"Persistence", "Defense Evasion", "Exfiltration"},
        "techniques": ["T1059", "T1071", "T1486", "T1547", "T1027"],
        "notes": "Known for destructive malware and ransomware. Targets financial institutions and critical infrastructure.",
    },
    {
        "name": "FIN7 / Carbanak",
        "motivation": "Financial gain (cybercrime)",
        "required_tactics": {"Execution", "Persistence", "Collection"},
        "optional_tactics": {"Credential Access", "Command and Control", "Exfiltration"},
        "techniques": ["T1059", "T1547", "T1005", "T1003", "T1071"],
        "notes": "Sophisticated financially-motivated group. Targets retail and hospitality sectors.",
    },
    {
        "name": "Mirai Botnet Operator",
        "motivation": "DDoS for hire / Cryptomining",
        "required_tactics": {"Execution", "Command and Control"},
        "optional_tactics": {"Persistence", "Impact", "Initial Access"},
        "techniques": ["T1059", "T1071", "T1190", "T1489", "T1105"],
        "notes": "IoT-focused botnet malware. C2 beaconing and persistence are key indicators.",
    },
    {
        "name": "Generic Ransomware Actor",
        "motivation": "Financial extortion",
        "required_tactics": {"Execution", "Impact"},
        "optional_tactics": {"Defense Evasion", "Exfiltration", "Command and Control"},
        "techniques": ["T1059", "T1486", "T1490", "T1027", "T1041"],
        "notes": "Ransomware-as-a-service operator. File encryption and backup deletion are primary indicators.",
    },
    {
        "name": "Generic Keylogger / Stealer",
        "motivation": "Credential theft / Data exfiltration",
        "required_tactics": {"Collection", "Exfiltration"},
        "optional_tactics": {"Persistence", "Command and Control", "Defense Evasion"},
        "techniques": ["T1056", "T1005", "T1041", "T1547", "T1073"],
        "notes": "Credential harvesting malware. Targets browser data, keystrokes, and clipboard.",
    },
]


def profile_adversary(correlation: CorrelationResult) -> AdversaryProfile | None:
    """Match MITRE tactics and techniques to a known threat actor profile."""
    observed_tactics = set(correlation.mitre_tactics)
    observed_techniques = set()
    for ev in correlation.timeline:
        if ev.mitre_technique:
            base = ev.mitre_technique.split(".")[0]
            observed_techniques.add(base)

    best_match = None
    best_score = 0
    matched_ttps: list[str] = []

    for profile in _PROFILES:
        required = profile["required_tactics"]
        optional = profile["optional_tactics"]
        profile_techniques = set(profile["techniques"])

        required_hits = len(required & observed_tactics)
        optional_hits = len(optional & observed_tactics)
        technique_hits = len(profile_techniques & observed_techniques)

        if required_hits < max(1, len(required) // 2):
            continue

        score = (required_hits * 3) + (optional_hits * 1) + (technique_hits * 2)

        if score > best_score:
            best_score = score
            best_match = profile
            matched_ttps = list(profile_techniques & observed_techniques)

    if not best_match or best_score < 3:
        return None

    max_possible = (
        len(best_match["required_tactics"]) * 3
        + len(best_match["optional_tactics"]) * 1
        + len(best_match["techniques"]) * 2
    )
    confidence = min(int((best_score / max_possible) * 100), 95)

    return AdversaryProfile(
        name=best_match["name"],
        motivation=best_match["motivation"],
        ttps=matched_ttps,
        confidence=confidence,
        notes=best_match["notes"],
    )
