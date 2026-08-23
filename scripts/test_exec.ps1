$mongod = "C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe"
$p = Start-Process -FilePath $mongod -ArgumentList "--version" -NoNewWindow -PassThru -Wait -RedirectStandardOutput "$env:TEMP\mongod_out.txt" -RedirectStandardError "$env:TEMP\mongod_err.txt"
Write-Host "ExitCode: $($p.ExitCode)"
Write-Host "STDOUT:"
Get-Content "$env:TEMP\mongod_out.txt" -ErrorAction SilentlyContinue
Write-Host "STDERR:"
Get-Content "$env:TEMP\mongod_err.txt" -ErrorAction SilentlyContinue
