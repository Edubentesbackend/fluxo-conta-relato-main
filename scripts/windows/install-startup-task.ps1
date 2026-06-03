. "$PSScriptRoot\common.ps1"

$root = Get-ProjectRoot
$startScript = Join-Path $root "scripts\windows\start-host.ps1"
$taskName = "FluxoContaRelatoHost"
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent().Name

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$startScript`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $currentUser
$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -RestartCount 20 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Inicia o hosting local do Fluxo Financeiro no logon." `
  -Force | Out-Null

Write-Host "Tarefa $taskName instalada para $currentUser."
Write-Host "Use npm.cmd run host:restart para iniciar ou recuperar o hosting."
