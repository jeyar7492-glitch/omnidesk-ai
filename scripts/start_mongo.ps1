$ErrorActionPreference = "Continue"

$mongodExe = "C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe"
$mongoshExe = (Get-ChildItem -Path "$env:LOCALAPPDATA\Programs\mongosh" -Recurse -Filter "mongosh.exe" | Select-Object -First 1).FullName
$dbPath = "$env:LOCALAPPDATA\MongoDB\data"
$logPath = "$env:LOCALAPPDATA\MongoDB\log\mongod.log"

$logDir = [System.IO.Path]::GetDirectoryName($logPath)

if (-not (Test-Path $dbPath)) {
    New-Item -ItemType Directory -Path $dbPath -Force | Out-Null
}
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

Write-Host "MongoDB binary: $mongodExe"
Write-Host "mongosh binary: $mongoshExe"
Write-Host "dbPath: $dbPath"

# Check if mongod is already running on 27017
$tcp = Get-NetTCPConnection -LocalPort 27017 -ErrorAction SilentlyContinue
if (-not $tcp) {
    Write-Host "Starting mongod process with replica set rs0..."
    Start-Process -FilePath $mongodExe -ArgumentList "--dbpath `"$dbPath`" --replSet rs0 --port 27017 --bind_ip 127.0.0.1 --logpath `"$logPath`"" -WindowStyle Hidden
    Start-Sleep -Seconds 3
} else {
    Write-Host "MongoDB is already running on port 27017."
}

# Verify listener
$tcpAfter = Get-NetTCPConnection -LocalPort 27017 -ErrorAction SilentlyContinue
if ($tcpAfter) {
    Write-Host "Port 27017 is actively listening!"
    
    # Initiate replica set if not already initiated
    Write-Host "Checking / Initiating replica set rs0 with mongosh..."
    $initResult = & $mongoshExe --port 27017 --eval "try { rs.initiate(); print('RS_INITIATED'); } catch(e) { if (e.message.includes('already initialized')) { print('RS_ALREADY_INITIATED'); } else { print('RS_ERROR: ' + e.message); } }" --quiet
    Write-Host "Init output: $initResult"

    Start-Sleep -Seconds 2

    # Verify replica set status
    $rsStatus = & $mongoshExe --port 27017 --eval "rs.status().ok" --quiet
    Write-Host "Replica Set Status OK: $rsStatus"

    $rsName = & $mongoshExe --port 27017 --eval "rs.status().set" --quiet
    Write-Host "Replica Set Name: $rsName"
} else {
    Write-Host "ERROR: Failed to bind to port 27017."
    if (Test-Path $logPath) {
        Get-Content -Path $logPath -Tail 20
    }
}
