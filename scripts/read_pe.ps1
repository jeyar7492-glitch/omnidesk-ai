$exePath = "C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe"
if (-not (Test-Path $exePath)) {
    Write-Host "File not found: $exePath"
    exit
}

$bytes = [System.IO.File]::ReadAllBytes($exePath)
$ascii = [System.Text.Encoding]::ASCII.GetString($bytes)
$dllMatches = [regex]::Matches($ascii, "[a-zA-Z0-9_\-\.]+\.dll", "IgnoreCase")
$uniqueDlls = $dllMatches | ForEach-Object { $_.Value.ToLower() } | Select-Object -Unique | Sort-Object

Write-Host "=== DLLs referenced by mongod.exe ==="
foreach ($dll in $uniqueDlls) {
    if ($dll.Length -gt 4 -and $dll.Length -lt 30) {
        $inSys32 = Test-Path "C:\Windows\System32\$dll"
        $inWin = Test-Path "C:\Windows\$dll"
        $inAppDir = Test-Path "C:\Program Files\MongoDB\Server\8.3\bin\$dll"
        $status = if ($inSys32 -or $inWin -or $inAppDir) { "FOUND" } else { "MISSING" }
        Write-Host "$($dll.PadRight(30)) : $status"
    }
}
