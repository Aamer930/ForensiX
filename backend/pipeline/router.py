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
}

# Magic byte signatures for memory dumps (lime, raw, vmem, crashdump)
_MEMORY_MAGIC = [
    b"\x45\x4c\x44\x01",  # LiME
    b"\x4d\x44\x4d\x50",  # Windows crash dump (MDMP)
]


def detect_file_type(file_path: str) -> FileType:
    try:
        mime = magic.from_file(file_path, mime=True)
    except Exception:
        return FileType.unknown

    # Check raw magic bytes for memory dump signatures
    with open(file_path, "rb") as f:
        header = f.read(8)
    for sig in _MEMORY_MAGIC:
        if header.startswith(sig):
            return FileType.memory_dump

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
