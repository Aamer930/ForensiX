rule Cridex_Banking_Trojan {
    meta:
        description = "Cridex / Bugat banking trojan memory indicators"
        family = "Cridex"
        severity = "critical"
        reference = "Volatility Foundation test sample"
    strings:
        $s1 = "reader_sl.exe" nocase
        $s2 = "explorer.exe" nocase
        $s3 = "svchost.exe" nocase
        $s4 = "\\Adobe\\Reader" nocase
        $s5 = "41.168.5.140" nocase
        $s6 = "125.19.103.198" nocase
        $net1 = ":8080" nocase
    condition:
        3 of ($s1, $s2, $s3, $s4) or any of ($s5, $s6, $net1)
}

rule Banking_Trojan_Network {
    meta:
        description = "Banking trojan C2 communication patterns"
        severity = "critical"
    strings:
        $p1 = ":8080" nocase
        $p2 = ":443" nocase
        $p3 = ":4443" nocase
        $api1 = "InternetOpenUrl" nocase
        $api2 = "HttpSendRequest" nocase
        $api3 = "InternetConnect" nocase
        $api4 = "HttpOpenRequest" nocase
    condition:
        any of ($p1, $p2, $p3) and 2 of ($api1, $api2, $api3, $api4)
}
