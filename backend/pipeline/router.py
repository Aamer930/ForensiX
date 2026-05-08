import logging
import os
import magic
from models import FileType

logger = logging.getLogger(__name__)

_MIME_MAP = {
    # PE / Windows executables — all variants libmagic may return
    "application/x-dosexec":          FileType.pe_executable,
    "application/x-executable":       FileType.pe_executable,
    "application/x-sharedlib":        FileType.pe_executable,
    "application/x-msdownload":       FileType.pe_executable,
    "application/x-ms-dos-executable":FileType.pe_executable,
    "application/x-winexe":           FileType.pe_executable,
    "application/x-win-bitmap":       FileType.pe_executable,
    # generic binary — check extension before committing to memory_dump
    "application/octet-stream":       None,  # resolved by extension fallback below
    # logs
    "text/plain":                     FileType.log_file,
    "text/x-log":                     FileType.log_file,
    # disk images
    "application/x-iso9660-image":    FileType.disk_image,
    "application/x-raw-disk-image":   FileType.disk_image,
    # PCAP
    "application/vnd.tcpdump.pcap":   FileType.pcap_capture,
    "application/x-pcap":             FileType.pcap_capture,
}

# Extension → FileType fallback (used when MIME is ambiguous/zip/octet-stream)
_EXT_MAP = {
    ".exe":   FileType.pe_executable,
    ".dll":   FileType.pe_executable,
    ".sys":   FileType.pe_executable,
    ".scr":   FileType.pe_executable,
    ".drv":   FileType.pe_executable,
    ".ocx":   FileType.pe_executable,
    ".vmem":  FileType.memory_dump,
    ".raw":   FileType.memory_dump,
    ".mem":   FileType.memory_dump,
    ".dmp":   FileType.memory_dump,
    ".lime":  FileType.memory_dump,
    ".pcap":  FileType.pcap_capture,
    ".pcapng":FileType.pcap_capture,
    ".cap":   FileType.pcap_capture,
    ".evtx":  FileType.windows_eventlog,
    ".log":   FileType.log_file,
    ".txt":   FileType.log_file,
}

# Magic byte signatures for memory dumps
_MEMORY_MAGIC = [
    b"\x45\x4c\x44\x01",  # LiME
    b"\x4d\x44\x4d\x50",  # Windows crash dump (MDMP)
]

# Magic byte signatures for PCAP / PCAPng
_PCAP_MAGIC = [
    b"\xd4\xc3\xb2\xa1",  # pcap little-endian
    b"\xa1\xb2\xc3\xd4",  # pcap big-endian
    b"\x0a\x0d\x0d\x0a",  # pcapng
]

# Windows Event Log
_EVTX_MAGIC = b"\x45\x6c\x66\x4c\x6f\x67\x00"  # "ElfLog\0"

# PE magic bytes — MZ header
_PE_MAGIC = b"\x4d\x5a"  # "MZ"


def detect_file_type(file_path: str) -> FileType:
    ext = os.path.splitext(file_path)[1].lower()

    try:
        mime = magic.from_file(file_path, mime=True)
    except Exception as e:
        logger.warning("MIME detection failed for %s: %s — using ext fallback", file_path, e)
        return _EXT_MAP.get(ext, FileType.unknown)

    # Read header bytes for signature matching
    try:
        with open(file_path, "rb") as f:
            header = f.read(16)
    except Exception:
        header = b""

    logger.info("detect_file_type: ext=%s mime=%s header=%s", ext, mime, header[:4].hex())

    # 1. Raw magic byte checks (highest priority)
    for sig in _MEMORY_MAGIC:
        if header.startswith(sig):
            return FileType.memory_dump
    for sig in _PCAP_MAGIC:
        if header.startswith(sig):
            return FileType.pcap_capture
    if header[:7] == _EVTX_MAGIC:
        return FileType.windows_eventlog
    # MZ header → definitely a PE regardless of what libmagic says
    if header.startswith(_PE_MAGIC):
        return FileType.pe_executable

    # 2. MIME map lookup
    if mime in _MIME_MAP:
        mapped = _MIME_MAP[mime]
        if mapped is not None:
            return mapped
        # mapped is None (octet-stream) — fall through to extension check

    # 3. Extension fallback
    if ext in _EXT_MAP:
        return _EXT_MAP[ext]

    # 4. ZIP from MalwareBazaar or other archives — use original filename extension
    if mime in ("application/zip", "application/x-zip-compressed",
                "application/x-zip", "application/gzip",
                "application/x-gzip", "application/x-7z-compressed"):
        # Can't analyze compressed archives directly
        return FileType.unknown

    # 5. Generic binary fallback → treat as memory dump
    if mime == "application/octet-stream":
        return FileType.memory_dump

    # 6. Text-like MIME types → log file
    if mime.startswith("text/"):
        return FileType.log_file

    return FileType.unknown
