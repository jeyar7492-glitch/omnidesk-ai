$installed = Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*, HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*, HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like "*Visual C++*" }
$installed | Select-Object DisplayName, DisplayVersion

# Also check for System32 DLLs
$dlls = @("vcruntime140.dll", "vcruntime140_1.dll", "msvcp140.dll", "msvcp140_1.dll", "msvcp140_2.dll", "msvcp140_codecvt_ids.dll")
foreach ($d in $dlls) {
    $sys32Path = "C:\Windows\System32\$d"
    Write-Host "$d exists in System32: $(Test-Path $sys32Path)"
}
