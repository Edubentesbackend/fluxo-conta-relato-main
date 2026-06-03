. "$PSScriptRoot\common.ps1"

$root = Get-ProjectRoot
$backupDir = Join-Path $root "server\backups"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $backupDir "fluxo_conta_relato-$timestamp.dump"
$pgDump = Get-PgDumpPath
$databaseUrl = Get-PsqlDatabaseUrl

& $pgDump "--dbname=$databaseUrl" "--format=custom" "--file=$backupPath"
if ($LASTEXITCODE -ne 0) {
  throw "Falha ao criar backup do PostgreSQL."
}

$item = Get-Item $backupPath
$hash = (Get-FileHash -Algorithm SHA256 $backupPath).Hash
Write-Host "Backup criado: $($item.FullName)"
Write-Host "Tamanho: $($item.Length) bytes"
Write-Host "SHA256: $hash"
