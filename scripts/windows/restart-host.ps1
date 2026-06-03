. "$PSScriptRoot\common.ps1"

$root = Get-ProjectRoot
$startScript = Join-Path $root "scripts\windows\start-host.ps1"
$taskName = "FluxoContaRelatoHost"

foreach ($process in Get-ProjectNodeProcesses) {
  Stop-Process -Id $process.ProcessId -Force
}

Start-Sleep -Milliseconds 500

if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
  Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  Start-ScheduledTask -TaskName $taskName
  Write-Host "Tarefa $taskName reiniciada."
} else {
  Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$startScript`"" `
    -WorkingDirectory $root `
    -WindowStyle Hidden
  Write-Host "Hosting iniciado em segundo plano."
}

Start-Sleep -Seconds 2
& "$PSScriptRoot\diagnose-host.ps1"
