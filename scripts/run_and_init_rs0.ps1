$ErrorActionPreference = "Continue"

$mongod = "$env:LOCALAPPDATA\Programs\mongodb-7\mongodb-win32-x86_64-windows-7.0.14\bin\mongod.exe"
$mongosh = (Get-ChildItem -Path "$env:LOCALAPPDATA\Programs\mongosh" -Recurse -Filter "mongosh.exe" | Select-Object -ExpandProperty FullName -First 1)
$dbPath = "$env:LOCALAPPDATA\MongoDB\data"
$logPath = "$env:LOCALAPPDATA\MongoDB\log\mongod.log"

if (-not (Test-Path $dbPath)) {
    New-Item -ItemType Directory -Path $dbPath -Force | Out-Null
}
$logDir = [System.IO.Path]::GetDirectoryName($logPath)
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

Write-Host "mongod: $mongod"
Write-Host "mongosh: $mongosh"

# Check if already listening
$tcp = Get-NetTCPConnection -LocalPort 27017 -ErrorAction SilentlyContinue
if (-not $tcp) {
    Write-Host "Starting mongod daemon on 127.0.0.1:27017 with replSet rs0..."
    Start-Process -FilePath $mongod -ArgumentList "--dbpath `"$dbPath`" --replSet rs0 --port 27017 --bind_ip 127.0.0.1 --logpath `"$logPath`"" -WindowStyle Hidden
    Start-Sleep -Seconds 3
}

$tcp = Get-NetTCPConnection -LocalPort 27017 -ErrorAction SilentlyContinue
if ($tcp) {
    Write-Host "SUCCESS: mongod listening on port 27017."

    Write-Host "Initiating replica set rs0..."
    $initRes = & $mongosh --port 27017 --eval "
        try {
            var res = rs.initiate({
                _id: 'rs0',
                members: [{ _id: 0, host: '127.0.0.1:27017' }]
            });
            print(JSON.stringify(res));
        } catch(e) {
            print('ERR: ' + e.message);
        }
    " --quiet
    Write-Host "Initiate result: $initRes"

    # Wait for PRIMARY election
    Start-Sleep -Seconds 3

    Write-Host "Checking replica set status:"
    $statusRes = & $mongosh --port 27017 --eval "
        var s = rs.status();
        print('SET_NAME: ' + s.set);
        print('STATUS_OK: ' + s.ok);
        print('PRIMARY_STATE: ' + s.members[0].stateStr);
    " --quiet
    Write-Host $statusRes
} else {
    Write-Host "FAIL: mongod failed to bind to port 27017."
    if (Test-Path $logPath) {
        Get-Content $logPath -Tail 25
    }
}
