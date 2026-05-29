# fluxo-conta-relato — Documentação Técnica Completa

> Sistema de Gestão de Transações Financeiras e Relatórios Institucionais
> Fundação de Apoio Institucional Muraki

---

## Sumário

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Arquitetura Geral](#2-arquitetura-geral)
3. [Stack Tecnológica](#3-stack-tecnológica)
4. [FRONTEND — Estrutura Detalhada](#4-frontend--estrutura-detalhada)
5. [HOOKS — Camada de Dados](#5-hooks--camada-de-dados)
6. [TIPOS E UTILITÁRIOS](#6-tipos-e-utilitários)
7. [BACKEND — Supabase](#7-backend--supabase)
8. [CONFIGURAÇÃO E INFRAESTRUTURA](#8-configuração-e-infraestrutura)
9. [Fluxo de Dados](#9-fluxo-de-dados)
10. [Paradigmas Utilizados](#10-paradigmas-utilizados)
11. [Portabilidade](#11-portabilidade)
12. [Scripts Disponíveis](#12-scripts-disponíveis)
13. [Estatísticas do Projeto](#13-estatísticas-do-projeto)

---

## 1. Visão Geral do Sistema

O **fluxo-conta-relato** é um sistema web de gestão de transações financeiras desenvolvido para a Fundação de Apoio Institucional Muraki. Ele permite registrar, visualizar, filtrar e exportar movimentações financeiras entre contas institucionais, com dashboards personalizados por perfil de usuário.

### O que o sistema faz

- **Registra transações** entre contas internas (empréstimos, devoluções, ajustes, rateios, correções, estornos e transferências operacionais)
- **Importa contas** em lote via planilhas Excel (.xlsx)
- **Gera relatórios** analíticos com gráficos, filtros avançados e exportação em PDF e Excel
- **Exibe dashboards** personalizados por perfil (CEO, CFO, Gerente, Analista)
- **Rastreia empréstimos** e suas respectivas devoluções
- **Gera insights executivos** com inteligência artificial (Google Gemini)

### Para quem foi feito

O sistema possui quatro perfis de acesso, cada um com visão adaptada às suas necessidades:

| Perfil | Foco |
|---|---|
| CEO | Metas anuais, crescimento e oportunidades estratégicas |
| CFO | Fluxo de caixa, EBITDA e indicadores de endividamento |
| Gerente | Performance operacional e alocação de recursos |
| Analista | Tendências detalhadas, previsões e detecção de anomalias |

---

## 2. Arquitetura Geral

### Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                      USUÁRIO                            │
│              (navegador / app instalado)                │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP/HTTPS
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND                             │
│                  React + TypeScript                     │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │   Páginas   │  │  Componentes │  │     Hooks     │   │
│  │  (Roteador) │  │  (UI/Visual) │  │  (Lógica de   │   │
│  │             │  │              │  │    Dados)     │   │
│  └─────────────┘  └──────────────┘  └───────┬───────┘   │
│                                             │           │
│  ┌──────────────────────────────────────────▼────────┐  │
│  │           React Query (Cache + Estado)            │  │
│  └──────────────────────────────────────────┬────────┘  │
│                                             │           │
│  ┌──────────────────────────────────────────▼────────┐  │
│  │           Supabase Client (SDK)                   │  │
│  └──────────────────────────────────────────┬────────┘  │
└─────────────────────────────────────────────────────────┘
                        │ HTTPS / REST / RPC
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  BACKEND — Supabase                     │
│                  (Backend as a Service)                 │
│                                                         │
│  ┌─────────────────────┐  ┌──────────────────────────┐  │
│  │  PostgreSQL         │  │    Edge Functions        │  │
│  │  ┌───────────────┐  │  │  ┌────────────────────┐  │  │
│  │  │  accounts     │  │  │  │ executive-insights │  │  │
│  │  │  transactions │  │  │  │ (Gemini AI / IA)   │  │  │
│  │  │  Views        │  │  │  └────────────────────┘  │  │
│  │  │  Triggers     │  │  │                          │  │
│  │  │  Funções      │  │  └──────────────────────────┘  │
│  │  └───────────────┘  │                                │
│  └─────────────────────┘                                │
└─────────────────────────────────────────────────────────┘
```

### Conceitos-chave para iniciantes

**O que é SPA (Single Page Application)?**
Uma SPA é um site que carrega apenas uma vez e atualiza o conteúdo dinamicamente, sem recarregar a página inteira. É como um aplicativo de celular rodando no navegador — mais rápido e fluido. O React é a tecnologia que faz isso acontecer.

**O que é BaaS (Backend as a Service)?**
Normalmente um sistema web precisa de dois servidores: um para a interface (frontend) e outro para os dados e regras de negócio (backend). O Supabase é um "backend pronto" — ele fornece banco de dados, autenticação e APIs automaticamente. Isso significa que o time não precisou programar um servidor do zero.

**O que é TypeScript?**
TypeScript é JavaScript com "regras extras". Ele obriga o programador a especificar o tipo de cada variável (número, texto, lista, etc.), o que evita erros antes mesmo de rodar o código.

---

## 3. Stack Tecnológica

### Core

| Tecnologia | Versão | Para que serve |
|---|---|---|
| React | 18.3.1 | Biblioteca principal para construir a interface |
| TypeScript | 5.8.3 | Adiciona tipos ao JavaScript, prevenindo erros |
| Vite | 5.4.19 | Ferramenta de build e servidor de desenvolvimento ultra-rápido |
| SWC | via plugin | Compilador de código (substitui Babel, é muito mais veloz) |

### Interface de Usuário

| Tecnologia | Versão | Para que serve |
|---|---|---|
| Tailwind CSS | 3.4.17 | Framework de estilos utilitários (classes CSS direto no HTML) |
| shadcn/ui | — | Biblioteca de componentes prontos (botões, tabelas, modais, etc.) |
| Radix UI | múltiplas | Componentes base acessíveis (sem estilo) usados pelo shadcn |
| Framer Motion | 12.23.13 | Animações fluidas de interface |
| Lucide React | 0.462.0 | Biblioteca de ícones SVG |
| Next Themes | 0.3.0 | Alternância entre modo claro e escuro |

### Roteamento e Estado

| Tecnologia | Versão | Para que serve |
|---|---|---|
| React Router DOM | 6.30.1 | Navegação entre páginas sem recarregar o navegador |
| TanStack Query | 5.83.0 | Gerencia dados do servidor: cache, loading, erros, revalidação |

### Formulários e Validação

| Tecnologia | Versão | Para que serve |
|---|---|---|
| React Hook Form | 7.61.1 | Gerencia estado e validação de formulários de forma eficiente |
| Zod | 3.25.76 | Define regras de validação de dados com TypeScript |

### Backend e Banco de Dados

| Tecnologia | Versão | Para que serve |
|---|---|---|
| Supabase JS | 2.55.0 | SDK do cliente para comunicar com o Supabase |
| PostgreSQL | 13.0.4 | Banco de dados relacional (gerenciado pelo Supabase) |

### Gráficos e Visualização

| Tecnologia | Versão | Para que serve |
|---|---|---|
| Recharts | 2.15.4 | Gráficos de barras, pizza, linha do tempo, etc. |
| Three.js | 0.180.0 | Renderização 3D no navegador |
| react-three/fiber | 8.18.0 | Integração do Three.js com React |

### Exportação de Dados

| Tecnologia | Versão | Para que serve |
|---|---|---|
| jsPDF | 3.0.3 | Geração de arquivos PDF no navegador |
| jspdf-autotable | 5.0.2 | Tabelas formatadas dentro dos PDFs |
| html2canvas | 1.4.1 | Captura de tela de elementos HTML para incluir no PDF |
| XLSX | 0.18.5 | Leitura e geração de planilhas Excel |
| date-fns | 3.6.0 | Manipulação e formatação de datas |

### Utilitários

| Tecnologia | Versão | Para que serve |
|---|---|---|
| clsx | 2.1.1 | Combinação condicional de classes CSS |
| tailwind-merge | — | Resolve conflitos entre classes Tailwind |
| Sonner | 1.7.4 | Notificações toast (avisos flutuantes na tela) |
| Embla Carousel | 8.6.0 | Componente de carrossel/slider |

---

## 4. FRONTEND — Estrutura Detalhada

### 4.1 Ponto de Entrada — Como o App Inicia

A inicialização do sistema segue esta ordem:

```
index.html
  └── src/main.tsx          ← monta o React no DOM
        └── ThemeProvider   ← habilita modo claro/escuro
              └── QueryClientProvider  ← habilita gerenciamento de dados
                    └── App.tsx        ← configura as rotas
                          ├── /        → pages/Index.tsx
                          └── *        → pages/NotFound.tsx
```

**Por que esses providers envolvem tudo?**
Providers são como "camadas globais" que disponibilizam recursos para todos os componentes dentro deles. O `ThemeProvider` deixa qualquer componente saber se está no modo escuro. O `QueryClientProvider` permite que qualquer hook use o cache de dados compartilhado.

### 4.2 Páginas (`src/pages/`)

| Arquivo | Rota | Descrição |
|---|---|---|
| [Index.tsx](src/pages/Index.tsx) | `/` | Página principal com 3 abas: Nova Transação, Importar Contas, Relatórios |
| [NotFound.tsx](src/pages/NotFound.tsx) | `*` | Página de erro 404 — rota não encontrada |

A página `Index.tsx` usa um componente de abas (Tabs) para organizar as três funções principais do sistema em uma única tela.

### 4.3 Componentes Raiz (`src/components/`)

| Arquivo | Descrição |
|---|---|
| [TransactionForm.tsx](src/components/TransactionForm.tsx) | Formulário completo para criação de transações. Valida todos os campos com Zod antes de enviar ao banco. |
| [AccountImport.tsx](src/components/AccountImport.tsx) | Importação em massa de contas via upload de planilha `.xlsx`. Processa o arquivo localmente e insere no banco. |
| [Reports.tsx](src/components/Reports.tsx) | Container que agrupa os componentes de relatórios. |

### 4.4 Dashboards por Perfil (`src/components/dashboard/ProfileDashboards/`)

Cada perfil tem seu próprio componente de dashboard com métricas relevantes à sua função:

| Arquivo | Perfil | Métricas Principais |
|---|---|---|
| [CEODashboard.tsx](src/components/dashboard/ProfileDashboards/CEODashboard.tsx) | CEO | Metas anuais, taxa de crescimento, participação de mercado, oportunidades estratégicas |
| [CFODashboard.tsx](src/components/dashboard/ProfileDashboards/CFODashboard.tsx) | CFO | Fluxo de caixa, margem EBITDA, nível de endividamento, posição de liquidez |
| [ManagerDashboard.tsx](src/components/dashboard/ProfileDashboards/ManagerDashboard.tsx) | Gerente | Performance da equipe, alocação de recursos, metas operacionais |
| [AnalystDashboard.tsx](src/components/dashboard/ProfileDashboards/AnalystDashboard.tsx) | Analista | Tendências históricas, previsões, detecção de anomalias, análises detalhadas |

### 4.5 Componentes de Dashboard (`src/components/dashboard/`)

| Arquivo | Descrição |
|---|---|
| [ActivityFeed.tsx](src/components/dashboard/ActivityFeed.tsx) | Exibe as transações mais recentes em formato de feed cronológico |
| [APIStatusMonitor.tsx](src/components/dashboard/APIStatusMonitor.tsx) | Monitora e exibe o status de saúde da conexão com o Supabase |
| [ExecutiveSummary.tsx](src/components/dashboard/ExecutiveSummary.tsx) | Resumo executivo com métricas-chave e insights gerados por IA (Gemini) |
| [ExportOptions.tsx](src/components/dashboard/ExportOptions.tsx) | Controles para exportar dados em PDF ou Excel |
| [HeatmapChart.tsx](src/components/dashboard/HeatmapChart.tsx) | Mapa de calor que visualiza padrões de transações por período |
| [MultiDashboardSelector.tsx](src/components/dashboard/MultiDashboardSelector.tsx) | Permite trocar entre os dashboards de CEO, CFO, Gerente e Analista |
| [PresentationMode.tsx](src/components/dashboard/PresentationMode.tsx) | Modo de apresentação em tela cheia para reuniões executivas |
| [SecurityIndicator.tsx](src/components/dashboard/SecurityIndicator.tsx) | Indicador visual do status de segurança e conformidade dos dados |

### 4.6 Relatórios (`src/components/reports/`)

| Arquivo | Descrição |
|---|---|
| [NewReportsDashboard.tsx](src/components/reports/NewReportsDashboard.tsx) | Hub central dos relatórios. Orquestra todos os outros componentes de relatório em abas: Dashboard, Transações, Detalhes de Conta, Filtros Avançados |
| [DetailedAccountReport.tsx](src/components/reports/DetailedAccountReport.tsx) | Relatório completo de uma conta: contrapartes, saldo corrente, histórico de transações com opções de exportação |
| [VisualAccountReport.tsx](src/components/reports/VisualAccountReport.tsx) | Versão visual do relatório de conta com gráficos de pizza, barras e linha do tempo de saldo |
| [ReturnsTracker.tsx](src/components/reports/ReturnsTracker.tsx) | Rastreador de devoluções de empréstimos — mostra quais empréstimos estão pendentes, parcialmente ou totalmente devolvidos |
| [SegregatedBalanceReport.tsx](src/components/reports/SegregatedBalanceReport.tsx) | Balancete segregado: mostra saldos separados por conta e contraparte |
| [TransactionDetailModal.tsx](src/components/reports/TransactionDetailModal.tsx) | Modal (janela flutuante) com todos os detalhes de uma transação específica |

### 4.7 Subcomponentes de Relatórios

#### Dashboard (`src/components/reports/Dashboard/`)
| Arquivo | Descrição |
|---|---|
| [KPICards.tsx](src/components/reports/Dashboard/KPICards.tsx) | Cartões de KPI: volume total, quantidade de transações, valor médio, conta mais ativa |
| [ActivityChart.tsx](src/components/reports/Dashboard/ActivityChart.tsx) | Gráfico de série temporal da atividade de transações |
| [AdvancedMetrics.tsx](src/components/reports/Dashboard/AdvancedMetrics.tsx) | Métricas avançadas calculadas e exibidas em formato visual |
| [BankStatementModal.tsx](src/components/reports/Dashboard/BankStatementModal.tsx) | Modal de extrato bancário com detalhes de movimentação |

#### Gráficos (`src/components/reports/charts/`)
| Arquivo | Descrição |
|---|---|
| [BalanceEvolutionSparkline.tsx](src/components/reports/charts/BalanceEvolutionSparkline.tsx) | Mini-gráfico (sparkline) da evolução do saldo ao longo do tempo |
| [BalanceTimelineChart.tsx](src/components/reports/charts/BalanceTimelineChart.tsx) | Gráfico completo de linha do tempo do saldo |
| [ComparisonBarChart.tsx](src/components/reports/charts/ComparisonBarChart.tsx) | Gráfico de barras comparando contas ou contrapartes |
| [CounterpartDistribution.tsx](src/components/reports/charts/CounterpartDistribution.tsx) | Distribuição de transações por contraparte |
| [DistributionPieChart.tsx](src/components/reports/charts/DistributionPieChart.tsx) | Gráfico de pizza para análise de distribuição |

#### Filtros (`src/components/reports/Filters/`)
| Arquivo | Descrição |
|---|---|
| [AdvancedFilters.tsx](src/components/reports/Filters/AdvancedFilters.tsx) | Interface de filtragem avançada: período, tipo de transação, faixa de valor, conta, descrição, status |

#### Tabelas (`src/components/reports/Tables/`)
| Arquivo | Descrição |
|---|---|
| [InteractiveTable.tsx](src/components/reports/Tables/InteractiveTable.tsx) | Tabela de transações ordenável, filtrável e paginável com coluna de saldo corrente |

#### Breakdown (`src/components/reports/breakdown/`)
| Arquivo | Descrição |
|---|---|
| [AdvancedAccountFilters.tsx](src/components/reports/breakdown/AdvancedAccountFilters.tsx) | Controles de filtragem no nível de conta individual |
| [DetailedExportHelpers.ts](src/components/reports/breakdown/DetailedExportHelpers.ts) | Funções utilitárias para exportar relatórios detalhados de conta em Excel/PDF |

#### Exportação (`src/components/reports/Export/`)
| Arquivo | Descrição |
|---|---|
| [ExportHelpers.ts](src/components/reports/Export/ExportHelpers.ts) | Funções de exportação para resumos de contas, transações e insights em Excel/PDF |

### 4.8 Biblioteca UI (`src/components/ui/`) — 60+ componentes

Esta pasta contém todos os componentes do shadcn/ui, que são blocos de construção reutilizáveis:

| Categoria | Componentes |
|---|---|
| Formulários | input, textarea, select, searchable-select, input-otp, checkbox, radio-group, toggle, switch |
| Layout | card, tabs, accordion, separator, sidebar, scroll-area, resizable, aspect-ratio |
| Modais e Sobreposições | dialog, drawer, alert-dialog, popover, hover-card, context-menu, tooltip |
| Navegação | breadcrumb, menubar, navigation-menu, pagination, dropdown-menu, command |
| Exibição de Dados | table, badge, avatar, carousel, chart, progress |
| Feedback | toast, toaster, sonner, skeleton |
| Especializados | calendar, collapsible, collapsible-card, guided-tour, help-center, smart-tooltip, pwa-installer, theme-toggle |

---

## 5. HOOKS — Camada de Dados

Hooks são funções especiais do React que encapsulam lógica reutilizável. No contexto deste sistema, os hooks customizados fazem a ponte entre os componentes visuais e o banco de dados.

**Como funciona um hook de dados?**
O componente chama o hook → o hook usa o React Query → o React Query verifica o cache → se não tiver, busca no Supabase → retorna os dados → o componente re-renderiza.

### `src/hooks/`

| Hook | Arquivo | O que faz |
|---|---|---|
| `useAccounts` | [useAccounts.ts](src/hooks/useAccounts.ts) | Busca todas as contas cadastradas no Supabase. Mantém os dados em cache para evitar requisições desnecessárias. |
| `useTransactions` | [useTransactions.ts](src/hooks/useTransactions.ts) | Busca transações com suporte a filtros opcionais: período, tipo, conta, faixa de valor, descrição. |
| `useCreateTransaction` | [useTransactions.ts](src/hooks/useTransactions.ts) | Mutação que envia uma nova transação ao banco e invalida o cache automaticamente. |
| `useAccountBreakdown` | [useAccountBreakdown.ts](src/hooks/useAccountBreakdown.ts) | Hook complexo que calcula: contrapartes por conta, saldo corrente, empréstimos pendentes, posição (devedora/credora/equilibrada). |
| `useTransactionInsights` | [useReportsData.ts](src/hooks/useReportsData.ts) | Chama a função RPC `get_transaction_insights` no banco para obter: volume total, contagem, média, conta mais ativa, maior transação, tipo mais comum. |
| `useMonthlyVolumes` | [useReportsData.ts](src/hooks/useReportsData.ts) | Chama `get_monthly_volumes` para obter volumes mensais agregados (padrão: 12 meses). |
| `useOptimizedAccountSummaries` | [useReportsData.ts](src/hooks/useReportsData.ts) | Busca a view materializada `account_summaries` com saldos pré-calculados. |
| `useMobile` | [use-mobile.tsx](src/hooks/use-mobile.tsx) | Detecta se o usuário está em um dispositivo móvel (largura < 768px). |
| `useToast` | [use-toast.ts](src/hooks/use-toast.ts) | Gerencia o estado das notificações toast (mensagens flutuantes). |

---

## 6. TIPOS E UTILITÁRIOS

### 6.1 Tipos do Banco de Dados (`src/types/database.ts`)

Define as interfaces TypeScript que espelham a estrutura do banco, garantindo que o código sempre trabalhe com os dados no formato correto:

```typescript
// Exemplos das principais interfaces:
Account            // Representa uma conta (id, name, account_number, etc.)
Transaction        // Representa uma transação completa
TransactionStatus  // Enum: 'pending_return' | 'partially_returned' | 'fully_returned' | 'completed'
TransactionType    // Enum: 'emprestimo' | 'devolucao' | 'ajuste' | ... (7 tipos)
AccountSummary     // Conta com saldos calculados (entries, exits, net_balance, position)
CounterpartSummary // Resumo de transações com uma contraparte específica
TransactionWithRunningBalance // Transação com saldo acumulado na linha
```

### 6.2 Tipos do Supabase (`src/integrations/supabase/types.ts`)

Arquivo **gerado automaticamente** pelo Supabase CLI. Contém os tipos TypeScript de todas as tabelas, views, funções e enums do banco. **Não editar manualmente.**

### 6.3 Utilitários de Moeda (`src/utils/currency.ts`)

| Função | O que faz | Exemplo |
|---|---|---|
| `formatCurrency(valor)` | Formata número como moeda brasileira | `1234.56` → `R$ 1.234,56` |
| `formatCurrencyInput(texto)` | Formata texto digitado como moeda | `"123456"` → `"1.234,56"` |
| `parseCurrencyInput(texto)` | Converte texto formatado de volta para número | `"1.234,56"` → `1234.56` |

### 6.4 Utilitário de Classes CSS (`src/lib/utils.ts`)

```typescript
cn(...classes)  // Combina classes Tailwind condicionalmente
// Exemplo: cn("text-red", isActive && "font-bold", "p-4")
```

Resolve conflitos entre classes Tailwind (ex: `text-sm` e `text-lg` juntos — mantém o último) usando `tailwind-merge` combinado com `clsx` para lógica condicional.

---

## 7. BACKEND — Supabase

### 7.1 O que é o Supabase

O Supabase funciona como o "servidor" deste sistema. Sem ele, seria necessário criar e manter uma API REST, um servidor Node.js ou Python, um banco de dados próprio, sistema de autenticação, etc. O Supabase provê tudo isso como serviço:

- **Banco de dados**: PostgreSQL gerenciado
- **API automática**: REST e GraphQL geradas automaticamente a partir das tabelas
- **RPC**: chamadas a funções PostgreSQL diretamente do frontend
- **Edge Functions**: código serverless (Deno/TypeScript) executado próximo ao usuário
- **Autenticação**: JWT integrado

### 7.2 Banco de Dados PostgreSQL

#### Tabela: `accounts`

Armazena as contas financeiras institucionais.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Identificador único gerado automaticamente |
| `name` | TEXT | NOT NULL, UNIQUE | Nome da conta (não pode repetir) |
| `description` | TEXT | nullable | Descrição opcional da conta |
| `account_number` | TEXT | nullable | Número gerado no formato `XXXX-Y` |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Data/hora de criação |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Data/hora da última modificação (trigger) |

#### Tabela: `transactions`

Registra todas as movimentações financeiras entre contas.

| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Identificador único |
| `unique_identifier` | TEXT | NOT NULL, UNIQUE | Código legível (formato: `TXN-2024-0001`) |
| `source_account_id` | UUID | NOT NULL, FK→accounts | Conta de onde sai o valor |
| `destination_account_id` | UUID | NOT NULL, FK→accounts | Conta que recebe o valor |
| `transaction_date` | TIMESTAMPTZ | NOT NULL | Data da transação |
| `amount` | DECIMAL(15,2) | NOT NULL, CHECK(>0) | Valor em reais (sempre positivo) |
| `transaction_type` | ENUM | NOT NULL | Tipo da operação (ver Enums) |
| `status` | ENUM | NOT NULL, DEFAULT 'completed' | Status atual (ver Enums) |
| `parent_transaction_id` | UUID | nullable, FK→transactions | Liga uma devolução ao empréstimo original |
| `description` | TEXT | NOT NULL | Descrição obrigatória da transação |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Data/hora de criação |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Data/hora da última modificação (trigger) |

**Restrição importante**: `source_account_id != destination_account_id` — uma conta não pode fazer transação consigo mesma.

#### View Materializada: `account_summaries`

Uma view materializada é como uma "foto" dos dados calculados, salva em disco para acesso rápido. O sistema a mantém atualizada automaticamente via trigger a cada INSERT, UPDATE ou DELETE na tabela `transactions`.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID | ID da conta |
| `name` | TEXT | Nome da conta |
| `account_number` | TEXT | Número da conta |
| `description` | TEXT | Descrição |
| `total_entries` | NUMERIC | Soma de valores recebidos (destino) |
| `total_exits` | NUMERIC | Soma de valores enviados (origem) |
| `net_balance` | NUMERIC | `total_entries - total_exits` |
| `position` | TEXT | `'devedora'`, `'credora'` ou `'equilibrada'` |
| `total_transactions` | NUMERIC | Contagem total de transações |

### 7.3 Enums — Tipos Fixos no Banco

**`transaction_type`** — Tipos de transação disponíveis:

| Valor | Significado |
|---|---|
| `emprestimo` | Empréstimo de recursos entre contas |
| `devolucao` | Devolução de empréstimo anterior |
| `ajuste` | Ajuste contábil |
| `rateio` | Divisão/distribuição de custos entre contas |
| `correcao` | Correção de lançamento incorreto |
| `estorno` | Estorno/cancelamento de transação |
| `transferencia_operacional` | Transferência de natureza operacional |

**`transaction_status`** — Status do ciclo de vida:

| Valor | Significado |
|---|---|
| `completed` | Transação concluída (padrão) |
| `pending_return` | Empréstimo aguardando devolução |
| `partially_returned` | Devolução parcial recebida |
| `fully_returned` | Devolução integral recebida |

### 7.4 Funções PostgreSQL (PL/pgSQL)

São funções escritas em SQL/PL que rodam diretamente no banco. Algumas são chamadas por triggers (automáticas), outras são chamadas pelo frontend via RPC.

| Função | Tipo | O que faz |
|---|---|---|
| `update_updated_at_column()` | Trigger | Atualiza o campo `updated_at` para `now()` antes de qualquer UPDATE |
| `generate_account_number()` | Utilitária | Gera número sequencial de conta no formato `XXXX-Y` com dígito verificador |
| `generate_transaction_identifier()` | Utilitária | Gera código `TXN-YYYY-NNNN` sequencial por ano (ex: `TXN-2025-0042`) |
| `auto_generate_transaction_identifier()` | Trigger | Chama `generate_transaction_identifier()` automaticamente no INSERT se o campo estiver vazio |
| `refresh_account_summaries()` | Utilitária | Recalcula manualmente a view materializada `account_summaries` |
| `refresh_summaries_trigger()` | Trigger | Recalcula a view após qualquer INSERT, UPDATE ou DELETE em `transactions` |
| `get_transaction_insights(start_date, end_date)` | RPC | Retorna métricas financeiras do período: volume, contagem, média, conta mais ativa, maior transação, tipo mais comum |
| `get_monthly_volumes(months_back)` | RPC | Retorna volumes mensais agregados para o gráfico de tendência (padrão: 12 meses) |

### 7.5 Triggers — Automações do Banco

Triggers são ações automáticas disparadas por eventos no banco. O desenvolvedor não precisa lembrar de chamá-los — o banco executa sozinho.

| Trigger | Tabela | Quando dispara | O que faz |
|---|---|---|---|
| `update_accounts_updated_at` | accounts | Antes de UPDATE | Atualiza `updated_at` |
| `update_transactions_updated_at` | transactions | Antes de UPDATE | Atualiza `updated_at` |
| `transactions_auto_identifier_trigger` | transactions | Antes de INSERT | Gera `TXN-YYYY-NNNN` automaticamente |
| `refresh_summaries_on_transaction_change` | transactions | Após INSERT/UPDATE/DELETE | Recalcula saldos na view `account_summaries` |

**Fluxo de uma nova transação com triggers:**
```
Frontend: INSERT na tabela transactions
  → Trigger 1 (BEFORE INSERT): gera unique_identifier se vazio → TXN-2025-0043
  → Registro gravado no banco
  → Trigger 2 (AFTER INSERT): recalcula account_summaries com novos saldos
  → Frontend recebe resposta de sucesso
  → React Query invalida cache → componentes re-renderizam com dados atualizados
```

### 7.6 Segurança — Row Level Security (RLS)

O RLS é um mecanismo do PostgreSQL que controla quais registros cada usuário pode ver ou modificar.

```
Estado atual:
  accounts:     RLS habilitado | Política: "permitir tudo" para todos
  transactions: RLS habilitado | Política: "permitir tudo" para todos
```

As políticas abertas são adequadas para sistemas internos institucionais onde todos os usuários têm o mesmo nível de acesso. Se no futuro for necessário restringir por usuário, basta adicionar políticas mais granulares sem mudar o código do frontend.

### 7.7 Edge Function: `executive-insights`

**Localização**: [`supabase/functions/executive-insights/`](supabase/functions/executive-insights/)

Edge Functions são pequenos servidores serverless que rodam na nuvem, próximos ao usuário. Esta função específica integra o sistema com Inteligência Artificial.

**Como funciona:**

```
ExecutiveSummary (componente React)
  → POST /functions/v1/executive-insights
    → Edge Function recebe os dados financeiros
      → Chama API Gemini 2.5 Flash (Google AI)
        → Gemini analisa os números
          → Retorna 3 insights executivos em português
        ← Insights retornam ao componente
      ← Exibidos no dashboard executivo
```

**Dados enviados para a IA:**
- Volume total de transações
- Quantidade de transações
- Valor médio por transação
- Conta mais ativa e seu volume
- Maior transação do período
- Tipo de transação mais comum
- Dados mensais dos últimos 3 meses

**O que a IA retorna:**
Uma string com 3 insights acionáveis em português, focando em:
1. Tendências de crescimento
2. Oportunidades de otimização
3. Alertas potenciais

---

## 8. CONFIGURAÇÃO E INFRAESTRUTURA

### 8.1 Servidor de Desenvolvimento (`vite.config.ts`)

```
URL de desenvolvimento: http://localhost:8080
Compilador: SWC (rápido, substituindo Babel)
Alias: @ → src/ (permite importar como "@/components/..." em vez de "../../components/...")
Hot Reload: sim (a página atualiza sozinha ao salvar um arquivo)
```

### 8.2 Variáveis de Ambiente (`.env`)

O arquivo `.env` armazena credenciais sensíveis que **não devem ser commitadas no Git**:

```env
VITE_SUPABASE_URL=https://bwwsiazhrogdepbpueiq.supabase.co
VITE_SUPABASE_PROJECT_ID=bwwsiazhrogdepbpueiq
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...  (chave JWT pública)
```

O prefixo `VITE_` é obrigatório para que o Vite exponha a variável ao código do frontend.

### 8.3 PWA — Aplicativo Progressivo (`public/`)

O sistema pode ser **instalado como um aplicativo nativo** em desktop e mobile:

| Arquivo | Descrição |
|---|---|
| [`public/sw.js`](public/sw.js) | Service Worker — permite funcionamento offline e cache de assets |
| [`public/manifest.json`](public/manifest.json) | Manifesto PWA — define nome, ícone e configurações para instalação |
| [`public/robots.txt`](public/robots.txt) | Instrui mecanismos de busca sobre o que indexar |
| [`public/favicon.ico`](public/favicon.ico) | Ícone da aba do navegador |

Para instalar: no Chrome, clique no ícone de instalação na barra de endereços.

### 8.4 Configuração TypeScript

| Arquivo | Propósito |
|---|---|
| [`tsconfig.json`](tsconfig.json) | Configuração base com alias `@/*` → `./src/*` |
| [`tsconfig.app.json`](tsconfig.app.json) | Configuração do código da aplicação (target: ES2020, JSX: react-jsx) |
| [`tsconfig.node.json`](tsconfig.node.json) | Configuração para arquivos de build (vite.config.ts) |

### 8.5 Qualidade de Código

| Arquivo | Ferramenta | Propósito |
|---|---|---|
| [`eslint.config.js`](eslint.config.js) | ESLint 9 | Detecta erros e más práticas no código TypeScript/React |
| [`postcss.config.js`](postcss.config.js) | PostCSS | Processa CSS: aplica Tailwind e adiciona prefixos de vendor |
| [`tailwind.config.ts`](tailwind.config.ts) | Tailwind CSS | Customizações: cores, animações, modo escuro por classe |

### 8.6 Configuração do shadcn/ui (`components.json`)

```json
{
  "framework": "React (TSX)",
  "tailwind": "tailwind.config.ts",
  "cssFile": "src/index.css",
  "baseColor": "Slate",
  "aliases": {
    "@/components": "components",
    "@/lib": "lib",
    "@/hooks": "hooks"
  }
}
```

---

## 9. Fluxo de Dados

### Leitura de Dados (Query)

```
Usuário acessa a tela de Relatórios
  ↓
NewReportsDashboard (componente) renderiza
  ↓
useTransactions() e useAccounts() (hooks) são chamados
  ↓
React Query verifica o cache interno
  ↓ (cache expirado ou vazio)
Supabase Client faz requisição HTTP para api.supabase.co
  ↓
PostgreSQL executa a query + aplica RLS
  ↓
Dados retornam em JSON
  ↓
React Query armazena em cache (evita re-buscar por 5 minutos)
  ↓
Componente re-renderiza exibindo os dados
```

### Criação de Transação (Mutation)

```
Usuário preenche e submete o TransactionForm
  ↓
React Hook Form valida com Zod (campo por campo)
  ↓ (se válido)
useCreateTransaction().mutate(dados) é chamado
  ↓
Supabase Client: INSERT INTO transactions ...
  ↓
Trigger BEFORE INSERT: gera TXN-YYYY-NNNN
  ↓
Registro gravado no banco
  ↓
Trigger AFTER INSERT: atualiza account_summaries
  ↓
React Query invalida cache de transações e contas
  ↓
Componentes que dependem desses dados re-renderizam
  ↓
Toast de sucesso exibido ao usuário
```

### Exportação de Relatório

```
Usuário clica em "Exportar PDF" ou "Exportar Excel"
  ↓
ExportHelpers.ts / DetailedExportHelpers.ts são chamados
  ↓
Para PDF: html2canvas captura elementos visuais → jsPDF monta o documento
Para Excel: XLSX cria workbook com abas formatadas
  ↓
Arquivo é gerado diretamente no navegador (sem servidor)
  ↓
Download automático para o computador do usuário
```

### Insights de IA

```
ExecutiveSummary (componente) carrega
  ↓
Chama Supabase Edge Function "executive-insights" via POST
  ↓
Edge Function recebe os dados financeiros do período
  ↓
Constrói prompt em português descrevendo os números
  ↓
Chama API Gemini 2.5 Flash (Google AI)
  ↓
Gemini retorna 3 insights executivos em português
  ↓
Resposta exibida no painel executivo
```

---

## 10. Paradigmas Utilizados

### SPA — Single Page Application
O sistema carrega **uma única página HTML** (`index.html`) e toda a navegação acontece em JavaScript, sem recarregar o navegador. O React Router simula páginas diferentes trocando componentes na tela.

### Component-Driven Development
A interface é construída como uma **árvore de componentes reutilizáveis**, do mais genérico (botão) ao mais específico (formulário de transação). Cada componente tem responsabilidade única e pode ser testado/substituído independentemente.

### Custom Hooks Pattern
Toda a lógica de **busca de dados e manipulação de estado** é encapsulada em hooks customizados (`useTransactions`, `useAccounts`, etc.). Os componentes visuais apenas chamam o hook e exibem o resultado — sem conhecer os detalhes de como os dados são buscados.

### BaaS — Backend as a Service
O Supabase elimina a necessidade de um servidor backend próprio. O frontend se comunica **diretamente com o banco de dados** via SDK, com segurança garantida pelo RLS e autenticação JWT.

### Declarative UI
Com React, o código descreve **O QUE mostrar** baseado no estado atual, não **COMO atualizar** o DOM. Quando os dados mudam, o React calcula as diferenças (Virtual DOM) e atualiza apenas o que foi alterado.

### Type Safety com TypeScript
Todos os dados têm tipos definidos. Se o código tentar usar uma propriedade que não existe ou passar um tipo errado, o TypeScript acusa o erro **antes de rodar o código**, evitando bugs em produção.

### Server State vs Client State
- **Server State** (dados do banco): gerenciado pelo **React Query** — tem cache, loading state, error state, revalidação automática
- **Client State** (estado da UI): gerenciado por **useState** do React — seleção de abas, modais abertos, filtros ativos

### Utility-First CSS com Tailwind
Em vez de criar arquivos CSS separados, as classes de estilo são aplicadas **diretamente nos elementos HTML**. Isso elimina a necessidade de nomear classes e mantém o estilo próximo ao componente que o usa.

---

## 11. Portabilidade

| Contexto | Suporte |
|---|---|
| Navegadores | Chrome, Firefox, Safari, Edge (versões modernas) |
| Mobile | Responsivo + instalável como PWA no Android e iOS |
| Desktop | Instalável como PWA no Windows, macOS e Linux |
| Sistema Operacional (Dev) | Windows, macOS, Linux |
| Deploy | Qualquer CDN estático: Vercel, Netlify, Cloudflare Pages, GitHub Pages |
| Backend | Supabase cloud-hosted — sem infraestrutura própria necessária |
| Offline | Parcial — via Service Worker (PWA) |

---

## 12. Scripts Disponíveis

Execute os comandos abaixo no terminal, dentro da pasta do projeto:

```bash
# Instalar dependências (obrigatório na primeira vez)
npm install

# Iniciar servidor de desenvolvimento com hot-reload
npm run dev
# Acesse: http://localhost:8080

# Gerar build de produção (otimizado e minificado)
npm run build

# Gerar build de desenvolvimento (não minificado, para debug)
npm run build:dev

# Pré-visualizar o build de produção localmente
npm run preview

# Verificar erros de código com ESLint
npm run lint
```

---

## 13. Estatísticas do Projeto

| Métrica | Quantidade |
|---|---|
| Arquivos TypeScript/TSX | ~107 |
| Componentes UI (shadcn/ui) | 60+ |
| Componentes customizados | 30+ |
| Hooks customizados | 6 |
| Páginas | 2 |
| Tabelas no banco | 2 |
| Views materializadas | 1 |
| Funções PostgreSQL | 8 |
| Triggers no banco | 4 |
| Edge Functions (serverless) | 1 |
| Migrações do banco | 6+ |
| Perfis de dashboard | 4 (CEO, CFO, Gerente, Analista) |
| Tipos de transação | 7 |
| Formatos de exportação | 2 (PDF, Excel) |

---

## Glossário para Iniciantes

| Termo | Explicado de forma simples |
|---|---|
| **API** | Interface de comunicação entre sistemas. Como um garçom que leva pedidos da mesa (frontend) para a cozinha (banco de dados). |
| **UUID** | Identificador único universal. Uma sequência de letras e números que jamais se repete, gerada automaticamente. Ex: `550e8400-e29b-41d4-a716-446655440000` |
| **ENUM** | Lista fechada de valores válidos. O campo `transaction_type` só aceita os 7 tipos definidos — qualquer outro valor é rejeitado pelo banco. |
| **View Materializada** | Uma consulta salva como tabela. O banco "tira uma foto" dos resultados calculados e a atualiza quando os dados mudam. Muito mais rápida que recalcular toda vez. |
| **Trigger** | Ação automática do banco que dispara em resposta a eventos (INSERT, UPDATE, DELETE). |
| **RLS** | Row Level Security — política de segurança que controla quais linhas do banco cada usuário pode ver ou modificar. |
| **JWT** | JSON Web Token — credencial digital assinada usada para autenticar usuários na API do Supabase. |
| **Cache** | Armazenamento temporário de dados já buscados, para não precisar buscá-los novamente. O React Query gerencia isso automaticamente. |
| **Hook** | Função especial do React que permite usar estado, efeitos e outros recursos em componentes funcionais. |
| **Build** | Processo de transformar o código-fonte (TypeScript, JSX) em arquivos otimizados (JavaScript puro) prontos para o navegador. |
| **Serverless** | Código que roda na nuvem sem um servidor dedicado. A infraestrutura é gerenciada automaticamente — você paga apenas pelo tempo de execução. |
| **PWA** | Progressive Web App — aplicativo web que pode ser instalado no dispositivo e funcionar parcialmente offline, como um app nativo. |
| **FK (Foreign Key)** | Chave estrangeira — referência de uma tabela a outra. O campo `source_account_id` em `transactions` aponta para um registro em `accounts`. |
| **Mutation** | No contexto do React Query, uma operação que modifica dados no servidor (INSERT, UPDATE, DELETE), ao contrário de uma query que apenas lê. |

---

*Documentação gerada com base na análise completa do código-fonte.*
*Projeto: fluxo-conta-relato | Fundação de Apoio Institucional Muraki*
