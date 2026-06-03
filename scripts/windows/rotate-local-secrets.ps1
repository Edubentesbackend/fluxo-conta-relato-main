param(
  [switch]$RotatePasswordPepper
)

. "$PSScriptRoot\common.ps1"

$root = Get-ProjectRoot
$psql = Get-PsqlPath
$currentDatabaseUrl = Get-PsqlDatabaseUrl
$values = Get-EnvValues
$databaseUrl = $values["DATABASE_URL"]

if ($databaseUrl -notmatch "^(postgresql://[^:]+:)([^@]+)(@.+)$") {
  throw "DATABASE_URL nao possui o formato esperado."
}

& "$PSScriptRoot\backup-database.ps1"

$nextDatabasePassword = New-RandomSecret 36
$nextJwtSecret = New-RandomSecret 48
$sql = "ALTER ROLE fluxo WITH PASSWORD '$nextDatabasePassword'; UPDATE refresh_tokens SET revoked_at = now() WHERE revoked_at IS NULL;"

& $psql "--dbname=$currentDatabaseUrl" -X -v ON_ERROR_STOP=1 -c $sql
if ($LASTEXITCODE -ne 0) {
  throw "Falha ao atualizar senha do PostgreSQL e revogar refresh tokens."
}

$nextDatabaseUrl = $databaseUrl -replace "^(postgresql://[^:]+:)([^@]+)(@.+)$", "`${1}$nextDatabasePassword`${3}"
Set-EnvValue "DATABASE_URL" $nextDatabaseUrl
Set-EnvValue "JWT_SECRET" $nextJwtSecret

if ($RotatePasswordPepper) {
  $userCount = & $psql "--dbname=$($nextDatabaseUrl -replace '\?schema=public$', '')" -X -q -t -A -c "SELECT count(*) FROM users WHERE is_active;"
  if ([int]$userCount -ne 1) {
    throw "Rotacao automatica do PASSWORD_PEPPER exige exatamente um usuario ativo. Encontrados: $userCount"
  }

  $securePassword = Read-Host "Digite a senha do administrador para recalcular o hash" -AsSecureString
  $credential = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($credential)
  $previousPepper = (Get-EnvValues)["PASSWORD_PEPPER"]
  try {
    Set-EnvValue "PASSWORD_PEPPER" (New-RandomSecret 48)
    $env:ADMIN_PASSWORD = $plainPassword
    Set-Location $root
    & npm.cmd run prisma:seed
    if ($LASTEXITCODE -ne 0) {
      throw "Falha ao recalcular credencial do administrador."
    }
  } catch {
    Set-EnvValue "PASSWORD_PEPPER" $previousPepper
    throw
  } finally {
    Remove-Item Env:ADMIN_PASSWORD -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($credential)
  }
}

Write-Host "Senha do PostgreSQL e JWT_SECRET rotacionados. Refresh tokens revogados."
if (-not $RotatePasswordPepper) {
  Write-Warning "PASSWORD_PEPPER ainda nao foi rotacionado. Execute novamente com -RotatePasswordPepper em janela controlada."
}
Write-Host "Reinicie o hosting com npm.cmd run host:restart."
