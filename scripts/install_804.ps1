$msi = Join-Path $env:TEMP "mongodb-installer.msi"
Write-Host "Installing 8.0.4 MSI: $msi"
$proc = Start-Process msiexec.exe -ArgumentList "/i `"$msi`" /qn /norestart SHOULD_INSTALL_COMPASS=`"0`" ADDLOCAL=`"ServerService,Client`"" -PassThru -Wait
Write-Host "MSI ExitCode: $($proc.ExitCode)"

$servers = Get-ChildItem "C:\Program Files\MongoDB\Server" -ErrorAction SilentlyContinue
$servers | Select-Object FullName
