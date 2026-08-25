# Setup mongosh and configure MongoDB replica set rs0

$tempZip = Join-Path $env:TEMP "mongosh.zip"
$destDir = "$env:LOCALAPPDATA\Programs\mongosh"

if (Test-Path $tempZip) {
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    Expand-Archive -Path $tempZip -DestinationPath $destDir -Force
    Write-Host "mongosh extracted to $destDir"
}

# Find mongosh.exe
$mongoshExe = (Get-ChildItem -Path $destDir -Recurse -Filter "mongosh.exe" -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
Write-Host "mongosh path: $mongoshExe"

# Find mongod.exe
$mongodExe = (Get-ChildItem -Path "C:\Program Files\MongoDB" -Recurse -Filter "mongod.exe" -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
Write-Host "mongod path: $mongodExe"

# Inspect MongoDB config file
$cfgPath = (Get-ChildItem -Path "C:\Program Files\MongoDB" -Recurse -Filter "mongod.cfg" -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
Write-Host "mongod.cfg path: $cfgPath"
if ($cfgPath) {
    $content = Get-Content -Path $cfgPath -Raw
    Write-Host "--- Current mongod.cfg ---"
    Write-Host $content
}
