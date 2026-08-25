$logPath = "$env:LOCALAPPDATA\MongoDB\log\mongod.log"
if (Test-Path $logPath) {
    Get-Content $logPath -Tail 50
} else {
    Write-Host "Log file does not exist at $logPath"
}
