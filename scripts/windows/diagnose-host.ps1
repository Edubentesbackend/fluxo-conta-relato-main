. "$PSScriptRoot\common.ps1"

$values = Get-EnvValues
$port = [int]$values["API_PORT"]
if (-not $port) { $port = 8080 }

Write-Host "== PostgreSQL =="
Get-Service "postgresql-x64-16" -ErrorAction SilentlyContinue |
  Select-Object Name, Status, StartType |
  Format-Table -AutoSize

Write-Host "== IPv4 ativos =="
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object {
    $_.IPAddress -notlike "127.*" -and
    $_.IPAddress -notlike "169.254*" -and
    $_.InterfaceAlias -notmatch "Loopback"
  } |
  Select-Object InterfaceAlias, IPAddress, PrefixLength, AddressState |
  Format-Table -AutoSize

Write-Host "== Listeners =="
$listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -in @($port, 5432) } |
  Select-Object LocalAddress, LocalPort, OwningProcess
$listeners | Format-Table -AutoSize

$externalDbListener = $listeners |
  Where-Object {
    $_.LocalPort -eq 5432 -and
    $_.LocalAddress -in @("0.0.0.0", "::", "*")
  }
if ($externalDbListener) {
  Write-Warning "PostgreSQL ainda possui listener externo. Execute npm.cmd run host:configure-network como administrador."
}

Write-Host "== DNS interno =="
try {
  Resolve-DnsName "fluxo-financeiro.local" -ErrorAction Stop |
    Select-Object Name, Type, IPAddress |
    Format-Table -AutoSize
} catch {
  Write-Warning "Alias fluxo-financeiro.local ainda nao foi criado no DNS do roteador."
}

Write-Host "== Health checks =="
foreach ($url in @(
  "http://127.0.0.1:$port/api/health/live",
  "http://127.0.0.1:$port/api/health/ready"
)) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 5
    Write-Host "$url -> $($response.StatusCode)"
  } catch {
    Write-Warning "$url -> indisponivel"
  }
}
