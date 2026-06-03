# Fluxo Conta Relato

Aplicacao React + API Node/TypeScript com PostgreSQL proprio. O runtime nao usa Supabase; os scripts `supabase:*` existem apenas para exportar/importar dados antigos durante a migracao.

## Requisitos

- Node.js 20+
- PostgreSQL 16+ nativo no Windows
- npm

## Hosting local na rede

O modo recomendado usa uma unica origem:

- Aplicacao e API: `http:45//fluxo-financeiro.local:8080`
- PostgreSQL: somente `localhost:5432`

O navegador chama `/api` na mesma origem. Nao exponha a porta `5432` na rede.

No roteador da rede interna:

1. Reserve `10.10.24.135` para a interface Ethernet da maquina hospedeira.
2. Crie o alias DNS `fluxo-financeiro.local` apontando para `10.10.24.135`.

Na maquina hospedeira, abra PowerShell como Administrador uma vez e execute:

```sh
npm run host:configure-env
npm run host:configure-network
```

Depois, em um terminal normal:

```sh
npm run host:build
npm run host:install-startup
npm run host:restart
npm run host:diagnose
```

`host:install-startup` cria a tarefa `FluxoContaRelatoHost`, iniciada no logon e configurada para reiniciar apos falhas.

## Recuperacao

Use um unico comando para reiniciar e diagnosticar:

```sh
npm run host:restart
```

Para diagnosticar sem reiniciar:

```sh
npm run host:diagnose
```

Logs ficam em `logs/`. Backups locais ficam em `server/backups/`.

## Desenvolvimento

Copie `.env.example` para `.env`, ajuste valores sensiveis e aplique migrations:

```sh
npm run prisma:deploy
```

Crie ou atualize o admin inicial passando a senha apenas na sessao atual do terminal:

```powershell
$env:ADMIN_PASSWORD = Read-Host "Digite a senha do admin"
npm run prisma:seed
Remove-Item Env:ADMIN_PASSWORD
```

Rode API e frontend em dois terminais:

```sh
npm run dev:api
npm run dev
```

Frontend de desenvolvimento: `http://localhost:5173`
API e build de producao: `http://localhost:8080`

Credenciais iniciais de desenvolvimento:

- Email: `admin@local.dev`
- Senha: a senha digitada temporariamente ao rodar `npm run prisma:seed`

Nao salve `ADMIN_PASSWORD` em `.env`, `.env.example`, README ou qualquer arquivo versionado.

## Segredos

O arquivo `.env` nao deve ser versionado. Para rotacionar a senha do PostgreSQL, `JWT_SECRET` e revogar refresh tokens:

```sh
npm run host:rotate-secrets
```

A rotacao de `PASSWORD_PEPPER` invalida hashes atuais. Execute em uma janela controlada, com a senha do administrador disponivel:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/windows/rotate-local-secrets.ps1 -RotatePasswordPepper
```

## Migracao de dados do Supabase

Configure `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no ambiente e rode:

```sh
npm run supabase:export
npm run supabase:import -- server/tmp/<arquivo-exportado>.json
```

O import valida duplicidade de contas/transacoes e confere chaves estrangeiras antes de gravar.

## Verificacoes

```sh
npm run prisma:generate
npm run build:api
npm run build
npm run lint
npm run test:api
```
