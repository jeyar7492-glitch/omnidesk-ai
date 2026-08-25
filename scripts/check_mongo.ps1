Write-Host "--- 1. WINDOWS SERVICES ---"
$services = Get-Service | Where-Object { $_.Name -like "*mongo*" -or $_.DisplayName -like "*mongo*" }
if ($services) {
    $services | Format-Table -AutoSize
} else {
    Write-Host "No MongoDB services found."
}

Write-Host "`n--- 2. EXECUTABLES ---"
$pathsToCheck = @(
    "C:\Program Files\MongoDB",
    "C:\Program Files (x86)\MongoDB",
    "C:\MongoDB",
    "C:\tools\mongodb"
)
foreach ($p in $pathsToCheck) {
    if (Test-Path $p) {
        Write-Host "Found directory: $p"
        Get-ChildItem -Path $p -Recurse -Filter "*.exe" | Select-Object FullName
    }
}

Write-Host "`n--- 3. REGISTRY UNINSTALL ---"
$reg = Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*, HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like "*mongo*" }
if ($reg) {
    $reg | Select-Object DisplayName, DisplayVersion, InstallLocation
} else {
    Write-Host "No MongoDB entries in Windows Registry."
}

Write-Host "`n--- 4. PORT 27017 LISTENER ---"
$port = Get-NetTCPConnection -LocalPort 27017 -ErrorAction SilentlyContinue
if ($port) {
    $port | Format-Table -AutoSize
} else {
    Write-Host "Port 27017 is NOT listening."
}
