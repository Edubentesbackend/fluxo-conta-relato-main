# Fluxo Conta Relato

Aplicacao React + API Node/TypeScript com PostgreSQL proprio. O runtime nao usa Supabase; os scripts `supabase:*` existem apenas para exportar/importar dados antigos durante a migracao.

## Requisitos

- Node.js 20+
- PostgreSQL 16+ ou Docker
- npm

## Configuracao local

1. Copie `.env.example` para `.env` e ajuste valores sensiveis.
   Gere um `PASSWORD_PEPPER` longo e secreto; trocar esse valor invalida hashes de senha criados com o pepper antigo.
2. Suba o PostgreSQL:

```sh
docker compose up -d postgres
```

3. Aplique migrations e crie o admin inicial:

```sh
npm run prisma:deploy
npm run prisma:seed
```

4. Rode API e frontend em dois terminais:

```sh
npm run dev:api
npm run dev
```

Frontend: `http://localhost:8080`
API: `http://localhost:3001/api`

Credenciais iniciais de desenvolvimento:

- Email: `admin@local.dev`
- Senha: valor de `ADMIN_PASSWORD` no `.env`

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
