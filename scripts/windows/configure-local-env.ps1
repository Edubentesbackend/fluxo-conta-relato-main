. "$PSScriptRoot\common.ps1"

Set-EnvValue "API_HOST" "0.0.0.0"
Set-EnvValue "API_PORT" "8080"
Set-EnvValue "API_CORS_ORIGIN" ""
Set-EnvValue "VITE_API_BASE_URL" "/api"
Set-EnvValue "HOST_PUBLIC_URL" "http://fluxo-financeiro.local:8080"

Write-Host "Configuracao local atualizada para origem unica em http://fluxo-financeiro.local:8080"
