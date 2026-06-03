. "$PSScriptRoot\common.ps1"

if (-not (Test-IsAdministrator)) {
  throw "Execute este comando em um PowerShell aberto como Administrador."
}

$ruleName = "Fluxo Financeiro HTTP 8080"
$existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($existingRule) {
  Remove-NetFirewallRule -DisplayName $ruleName
}

New-NetFirewallRule `
  -DisplayName $ruleName `
  -Direction Inbound `
  -Action Allow `
  -Protocol TCP `
  -LocalPort 8080 `
  -Profile Domain,Private | Out-Null

$service = Get-CimInstance Win32_Service -Filter "Name='postgresql-x64-16'"
if (-not $service.PathName -or $service.PathName -notmatch '-D\s+"([^"]+)"') {
  throw "Nao foi possivel localizar o diretorio de dados do PostgreSQL."
}

$dataDir = $matches[1]
$configPath = Join-Path $dataDir "postgresql.auto.conf"
$hbaPath = Join-Path $dataDir "pg_hba.conf"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

Copy-Item $configPath "$configPath.$timestamp.bak" -Force
Copy-Item $hbaPath "$hbaPath.$timestamp.bak" -Force

$config = [IO.File]::ReadAllText($configPath)
$setting = "listen_addresses = 'localhost'"
if ($config -match "(?m)^\s*listen_addresses\s*=.*$") {
  $config = [Regex]::Replace($config, "(?m)^\s*listen_addresses\s*=.*$", $setting)
} else {
  $config = $config.TrimEnd() + [Environment]::NewLine + $setting + [Environment]::NewLine
}
[IO.File]::WriteAllText($configPath, $config, [Text.UTF8Encoding]::new($false))

Restart-Service "postgresql-x64-16"
(Get-Service "postgresql-x64-16").WaitForStatus("Running", [TimeSpan]::FromSeconds(20))

Write-Host "Firewall liberado somente para HTTP 8080 em redes Domain e Private."
Write-Host "PostgreSQL reiniciado com listen_addresses=localhost."
Write-Host "Backups criados: $configPath.$timestamp.bak e $hbaPath.$timestamp.bak"
$nonLocalHbaRules = Get-Content $hbaPath |
  Where-Object {
    $_ -match "^\s*host" -and
    $_ -notmatch "127\.0\.0\.1/32" -and
    $_ -notmatch "::1/128"
  }
if ($nonLocalHbaRules) {
  Write-Warning "pg_hba.conf ainda contem regras nao locais, mas elas ficam inativas com listen_addresses=localhost. Revise os backups antes de remove-las."
}
Write-Host "Configure no roteador: reserva DHCP 10.10.24.135 e alias DNS fluxo-financeiro.local."
