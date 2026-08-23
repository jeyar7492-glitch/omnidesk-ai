$mongod = "C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe"
$mongosh = (Get-ChildItem -Path "$env:LOCALAPPDATA\Programs\mongosh" -Recurse -Filter "mongosh.exe" | Select-Object -ExpandProperty FullName -First 1)

Write-Host "=== 1. MONGOD VERSION ==="
& $mongod --version

Write-Host "`n=== 2. MONGOSH VERSION ==="
& $mongosh --version

Write-Host "`n=== 3. RUNNING MONGOD WITH REPLICA SET ==="
$dataPath = "$env:LOCALAPPDATA\MongoDB\data"
if (-not (Test-Path $dataPath)) {
    New-Item -ItemType Directory -Path $dataPath -Force | Out-Null
}

$proc = Get-Process mongod -ErrorAction SilentlyContinue
if (-not $proc) {
    Write-Host "Launching mongod on 127.0.0.1:27017 with replSet rs0..."
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $mongod
    $psi.Arguments = "--dbpath `"$dataPath`" --replSet rs0 --port 27017 --bind_ip 127.0.0.1"
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    [System.Diagnostics.Process]::Start($psi) | Out-Null
    Start-Sleep -Seconds 3
}

Write-Host "`n=== 4. LISTENER CHECK ==="
$tcp = Get-NetTCPConnection -LocalPort 27017 -ErrorAction SilentlyContinue
if ($tcp) {
    Write-Host "SUCCESS: Port 27017 is actively listening."
    
    Write-Host "`n=== 5. REPLICA SET INITIATION ==="
    & $mongosh --port 27017 --eval "try { rs.initiate(); print('RS_INITIATE_OK'); } catch(e) { print(e.message); }" --quiet
    Start-Sleep -Seconds 2

    Write-Host "`n=== 6. REPLICA SET STATUS ==="
    & $mongosh --port 27017 --eval "print('ReplicaSet: ' + rs.status().set + ' | State: ' + rs.status().members[0].stateStr);" --quiet
} else {
    Write-Host "FAIL: Port 27017 is not listening."
}
