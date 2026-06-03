. "$PSScriptRoot\common.ps1"

$root = Get-ProjectRoot
Set-Location $root

& npm.cmd run prisma:deploy
if ($LASTEXITCODE -ne 0) { throw "Falha em prisma:deploy" }

& npm.cmd run build:api
if ($LASTEXITCODE -ne 0) { throw "Falha em build:api" }

& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "Falha no build do frontend" }

Write-Host "Build de hosting concluido."
