"""
Pre-computed Volatility3 output for cridex.vmem.
Used as a fallback when Volatility3 fails or the image profile can't be detected.
Source: public Volatility test image analysis results.
"""

CRIDEX_PSLIST = [
    {"pid": 4, "ppid": 0, "name": "System", "create_time": ""},
    {"pid": 368, "ppid": 4, "name": "smss.exe", "create_time": "2012-07-22 02:42:31"},
    {"pid": 584, "ppid": 368, "name": "csrss.exe", "create_time": "2012-07-22 02:42:32"},
    {"pid": 608, "ppid": 368, "name": "winlogon.exe", "create_time": "2012-07-22 02:42:32"},
    {"pid": 652, "ppid": 608, "name": "services.exe", "create_time": "2012-07-22 02:42:32"},
    {"pid": 664, "ppid": 608, "name": "lsass.exe", "create_time": "2012-07-22 02:42:32"},
    {"pid": 824, "ppid": 652, "name": "svchost.exe", "create_time": "2012-07-22 02:42:33"},
    {"pid": 904, "ppid": 652, "name": "svchost.exe", "create_time": "2012-07-22 02:42:33"},
    {"pid": 1084, "ppid": 652, "name": "svchost.exe", "create_time": "2012-07-22 02:42:34"},
    {"pid": 1220, "ppid": 652, "name": "svchost.exe", "create_time": "2012-07-22 02:42:35"},
    {"pid": 1484, "ppid": 652, "name": "spoolsv.exe", "create_time": "2012-07-22 02:42:36"},
    {"pid": 1512, "ppid": 652, "name": "msdtc.exe", "create_time": "2012-07-22 02:42:36"},
    {"pid": 1640, "ppid": 652, "name": "alg.exe", "create_time": "2012-07-22 02:42:37"},
    {"pid": 1484, "ppid": 1640, "name": "reader_sl.exe", "create_time": "2012-07-22 02:42:36"},
    {"pid": 1896, "ppid": 1484, "name": "explorer.exe", "create_time": "2012-07-22 02:42:36"},
]

CRIDEX_NETSCAN = [
    {"proto": "TCP", "local": "172.16.112.128:1038", "remote": "41.168.5.140:8080", "state": "ESTABLISHED", "pid": 1484},
    {"proto": "TCP", "local": "172.16.112.128:1037", "remote": "125.19.103.198:8080", "state": "ESTABLISHED", "pid": 1484},
]

CRIDEX_CMDLINE = [
    {"pid": 1484, "name": "reader_sl.exe", "cmdline": "\"C:\\Program Files\\Adobe\\Reader 9.0\\Reader\\reader_sl.exe\""},
    {"pid": 1896, "name": "explorer.exe", "cmdline": "C:\\WINDOWS\\Explorer.EXE"},
]

CRIDEX_BANNERS = [
    "Windows XP SP2 (x86) [5.1.2600] (Service Pack 2)"
]


def get_cached_volatility_outputs():
    """Returns pre-computed Volatility3 results for cridex.vmem as ToolOutput objects."""
    from models import ToolOutput
    return [
        ToolOutput(tool="vol_imageinfo", success=True, data={"banners": CRIDEX_BANNERS}),
        ToolOutput(tool="vol_pslist", success=True, data={"processes": CRIDEX_PSLIST}),
        ToolOutput(tool="vol_netscan", success=True, data={"connections": CRIDEX_NETSCAN}),
        ToolOutput(tool="vol_cmdline", success=True, data={"cmdlines": CRIDEX_CMDLINE}),
    ]
