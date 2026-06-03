. "$PSScriptRoot\common.ps1"

$root = Get-ProjectRoot
$apiEntry = Join-Path $root "server\dist\src\index.js"
$frontendEntry = Join-Path $root "dist\index.html"
$logDir = Join-Path $root "logs"

if (-not (Test-Path $apiEntry) -or -not (Test-Path $frontendEntry)) {
  throw "Build ausente. Execute npm.cmd run host:build antes de iniciar."
}

$postgres = Get-Service "postgresql-x64-16" -ErrorAction Stop
if ($postgres.Status -ne "Running") {
  Start-Service "postgresql-x64-16"
  $postgres.WaitForStatus("Running", [TimeSpan]::FromSeconds(20))
}

New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir ("host-" + (Get-Date -Format "yyyyMMdd") + ".log")

Set-Location $root
Write-Host "Iniciando Fluxo Financeiro em http://fluxo-financeiro.local:8080"
& node.exe $apiEntry *>> $logFile
exit $LASTEXITCODE
