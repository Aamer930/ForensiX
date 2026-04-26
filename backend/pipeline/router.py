import magic
from models import FileType

_MIME_MAP = {
    "application/octet-stream": FileType.memory_dump,  # generic binary — treat as potential dump
    "application/x-dosexec": FileType.pe_executable,
    "application/x-executable": FileType.pe_executable,
    "application/x-sharedlib": FileType.pe_executable,
    "text/plain": FileType.log_file,
    "text/x-log": FileType.log_file,
    "application/x-iso9660-image": FileType.disk_image,
    "application/x-raw-disk-image": FileType.disk_image,
    "application/vnd.tcpdump.pcap": FileType.pcap_capture,
}

# Magic byte signatures for memory dumps (lime, raw, vmem, crashdump)
_MEMORY_MAGIC = [
    b"\x45\x4c\x44\x01",  # LiME
    b"\x4d\x44\x4d\x50",  # Windows crash dump (MDMP)
]

# Magic byte signatures for PCAP / PCAPng captures
_PCAP_MAGIC = [
    b"\xd4\xc3\xb2\xa1",  # pcap little-endian
    b"\xa1\xb2\xc3\xd4",  # pcap big-endian
    b"\x0a\x0d\x0d\x0a",  # pcapng
]

# Magic byte signature for Windows Event Log (EVTX)
_EVTX_MAGIC = b"\x45\x6c\x66\x4c\x6f\x67\x00"  # "ElfLog\0"


def detect_file_type(file_path: str) -> FileType:
    try:
        mime = magic.from_file(file_path, mime=True)
    except Exception:
        return FileType.unknown

    # Check raw magic bytes for memory dump and PCAP signatures
    with open(file_path, "rb") as f:
        header = f.read(8)
    for sig in _MEMORY_MAGIC:
        if header.startswith(sig):
            return FileType.memory_dump
    for sig in _PCAP_MAGIC:
        if header.startswith(sig):
            return FileType.pcap_capture
    if header[:7] == _EVTX_MAGIC:
        return FileType.windows_eventlog

    # .vmem files are raw binary — treated as memory dump
    if mime == "application/octet-stream":
        return FileType.memory_dump

    mapped = _MIME_MAP.get(mime)
    if mapped:
        return mapped

    # Text-like MIME types → log file
    if mime.startswith("text/"):
        return FileType.log_file

    return FileType.unknown
