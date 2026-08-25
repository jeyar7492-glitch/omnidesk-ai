$zip = Join-Path $env:TEMP "mongodb-7.0.14.zip"
$dest = "$env:LOCALAPPDATA\Programs\mongodb-7"

if (-not (Test-Path $dest)) {
    New-Item -ItemType Directory -Path $dest -Force | Out-Null
}

Write-Host "Extracting $zip to $dest..."
Expand-Archive -Path $zip -DestinationPath $dest -Force
Write-Host "Extraction complete."

$mongod = (Get-ChildItem -Path $dest -Recurse -Filter "mongod.exe" | Select-Object -First 1).FullName
Write-Host "Found 7.0.14 mongod: $mongod"

Write-Host "Testing mongod --version:"
& $mongod --version
