$ErrorActionPreference = "Stop"

$script:ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$script:EnvPath = Join-Path $script:ProjectRoot ".env"

function Get-ProjectRoot {
  return $script:ProjectRoot
}

function Get-EnvValues {
  $values = @{}
  if (-not (Test-Path $script:EnvPath)) {
    throw "Arquivo .env nao encontrado em $script:EnvPath"
  }

  foreach ($line in Get-Content $script:EnvPath) {
    if ($line -match "^\s*([^#=]+)=(.*)$") {
      $key = $matches[1].Trim()
      $value = $matches[2].Trim()
      if ($value.StartsWith('"') -and $value.EndsWith('"')) {
        $value = $value.Substring(1, $value.Length - 2)
      }
      $values[$key] = $value
    }
  }

  return $values
}

function Set-EnvValue {
  param(
    [Parameter(Mandatory = $true)][string]$Key,
    [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Value
  )

  $content = [IO.File]::ReadAllText($script:EnvPath)
  $line = "$Key=`"$Value`""
  $pattern = "(?m)^\s*" + [Regex]::Escape($Key) + "=.*$"
  if ([Regex]::IsMatch($content, $pattern)) {
    $content = [Regex]::Replace($content, $pattern, $line)
  } else {
    $content = $content.TrimEnd() + [Environment]::NewLine + $line + [Environment]::NewLine
  }
  [IO.File]::WriteAllText($script:EnvPath, $content, [Text.UTF8Encoding]::new($false))
}

function Get-PsqlPath {
  $path = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
  if (-not (Test-Path $path)) {
    throw "psql nao encontrado em $path"
  }
  return $path
}

function Get-PgDumpPath {
  $path = "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe"
  if (-not (Test-Path $path)) {
    throw "pg_dump nao encontrado em $path"
  }
  return $path
}

function Get-PsqlDatabaseUrl {
  $values = Get-EnvValues
  return $values["DATABASE_URL"] -replace "\?schema=public$", ""
}

function Get-ProjectNodeProcesses {
  $root = Get-ProjectRoot
  return Get-CimInstance Win32_Process |
    Where-Object {
      $_.Name -match "^node(\.exe)?$" -and
      $_.CommandLine -and
      $_.CommandLine.Contains($root)
    }
}

function New-RandomSecret {
  param([int]$Bytes = 48)

  $buffer = New-Object byte[] $Bytes
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $generator.GetBytes($buffer)
  } finally {
    $generator.Dispose()
  }
  return [Convert]::ToBase64String($buffer).Replace("+", "-").Replace("/", "_").TrimEnd("=")
}

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}
