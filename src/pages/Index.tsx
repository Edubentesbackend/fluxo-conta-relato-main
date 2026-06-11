import React, { lazy, Suspense, useState } from 'react';
import { motion } from 'framer-motion';
import { BrandLogo } from '@/components/BrandLogo';
import { UserAccountMenu } from '@/components/UserAccountMenu';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  Plus,
  Upload,
  BarChart3,
  Database,
} from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';

const TransactionForm = lazy(() => import('@/components/TransactionForm').then(module => ({ default: module.TransactionForm })));
const AccountImport = lazy(() => import('@/components/AccountImport').then(module => ({ default: module.AccountImport })));
const NewReportsDashboard = lazy(() => import('@/components/reports/NewReportsDashboard').then(module => ({ default: module.NewReportsDashboard })));
const CadastrosPanel = lazy(() => import('@/components/CadastrosPanel').then(module => ({ default: module.CadastrosPanel })));

type Tab = 'transactions' | 'import' | 'reports' | 'cadastros';

const tabs: { id: Tab; label: string; icon: React.ElementType; gradient: string; glow: string }[] = [
  {
    id: 'transactions',
    label: 'Nova Transação',
    icon: Plus,
    gradient: 'gradient-transaction',
    glow: 'shadow-[0_0_20px_hsl(243_75%_59%/0.3)]',
  },
  {
    id: 'import',
    label: 'Importar Contas',
    icon: Upload,
    gradient: 'gradient-import',
    glow: 'shadow-[0_0_20px_hsl(192_91%_43%/0.3)]',
  },
  {
    id: 'reports',
    label: 'Relatórios',
    icon: BarChart3,
    gradient: 'gradient-reports',
    glow: 'shadow-[0_0_20px_hsl(221_83%_53%/0.3)]',
  },
  {
    id: 'cadastros',
    label: 'Cadastros',
    icon: Database,
    gradient: 'gradient-hero',
    glow: 'shadow-[0_0_20px_hsl(258_90%_66%/0.3)]',
  },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>('transactions');

  const { data: accounts = [] } = useAccounts();
  const { data: transactions = [] } = useTransactions({});

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
  };

  const totalVolume = Array.isArray(transactions)
    ? transactions.reduce((acc, t) => acc + (t.amount || 0), 0)
    : 0;

  const quickStats = [
    {
      label: 'Contas',
      value: accounts.length,
      suffix: '',
      icon: '🏦',
    },
    {
      label: 'Transações',
      value: Array.isArray(transactions) ? transactions.length : 0,
      suffix: '',
      icon: '⚡',
    },
    {
      label: 'Volume Total',
      value: totalVolume.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }),
      suffix: '',
      icon: '💰',
      isFormatted: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center justify-between gap-2 px-3 sm:h-16 sm:px-4">
          {/* Logo */}
          <BrandLogo
            className="shrink-0"
            imageClassName="h-8 w-8"
            textClassName="hidden text-base font-semibold sm:block"
          />

          {/* Nav — desktop */}
          <nav className="hidden md:flex flex-1 items-center justify-center">
            <div className="flex items-center gap-1 rounded-full border border-border/60 bg-secondary/40 p-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => switchTab(tab.id)}
                    className={`
                      flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200
                      ${active
                        ? `${tab.gradient} text-white ${tab.glow}`
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}
                    `}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Mobile: show active tab name */}
          <span className="flex-1 text-sm font-medium text-foreground md:hidden">
            {tabs.find(t => t.id === activeTab)?.label}
          </span>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <ThemeToggle />
            <UserAccountMenu />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 py-6 space-y-6 sm:px-4 sm:py-8 sm:space-y-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card"
        >
          {/* Background glow */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />

          <div className="relative px-6 py-6 md:px-8 md:py-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              {/* Copy */}
              <div className="space-y-2 min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-3 py-0.5 text-xs font-medium text-primary">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  Sistema Financeiro
                </span>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                  Gestão de <span className="text-gradient-hero">Transações</span>
                </h1>
                <p className="text-sm text-muted-foreground max-w-lg">
                  Controle de fluxo financeiro entre contas com relatórios e analytics em tempo real.
                </p>
              </div>

              {/* Quick stats — 3 cards em linha */}
              <div className="grid min-w-0 grid-cols-3 gap-2 lg:flex lg:gap-3 lg:shrink-0">
                {quickStats.map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    className="flex min-w-0 flex-col items-center gap-0.5 rounded-xl border border-border/60 bg-secondary/30 px-2 py-3 text-center sm:px-4 lg:min-w-[100px] lg:items-start lg:text-left"
                  >
                    <span className="text-base">{stat.icon}</span>
                    <span className={`max-w-full font-bold leading-tight ${
                      stat.isFormatted
                        ? 'whitespace-nowrap text-xs min-[360px]:text-sm sm:text-lg'
                        : 'break-words text-sm min-[360px]:text-base sm:text-lg'
                    }`}>
                      {stat.isFormatted ? stat.value : stat.value.toLocaleString('pt-BR')}
                      {stat.suffix}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{stat.label}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Mobile Tab Navigation */}
        <div className="grid grid-cols-4 gap-2 md:hidden">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`
                  flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-medium transition-all
                  ${active
                    ? `${tab.gradient} text-white shadow-medium`
                    : 'border border-border/60 bg-secondary/40 text-muted-foreground'}
                `}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden xs:block">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="relative min-w-0">
          <Suspense fallback={<SectionLoading />}>
              {activeTab === 'transactions' && (
                <div className="space-y-4">
                  <SectionHeader
                    icon={Plus}
                    gradient="gradient-transaction"
                    title="Nova Transação"
                    description="Registre uma movimentação entre contas com confirmação em 3 etapas."
                  />
                  <TransactionForm />
                </div>
              )}
              {activeTab === 'import' && (
                <div className="space-y-4">
                  <SectionHeader
                    icon={Upload}
                    gradient="gradient-import"
                    title="Importar Contas"
                    description="Adicione contas manualmente ou importe via planilha Excel/CSV."
                  />
                  <AccountImport />
                </div>
              )}
              {activeTab === 'reports' && (
                <div className="space-y-4">
                  <SectionHeader
                    icon={BarChart3}
                    gradient="gradient-reports"
                    title="Relatórios & Analytics"
                    description="Visualize métricas, tendências e exportações do período."
                  />
                  <NewReportsDashboard />
                </div>
              )}
              {activeTab === 'cadastros' && (
                <div className="space-y-4">
                  <SectionHeader
                    icon={Database}
                    gradient="gradient-hero"
                    title="Cadastros"
                    description="Visualize e edite as contas e coordenadores cadastrados no sistema."
                  />
                  <CadastrosPanel />
                </div>
              )}
          </Suspense>
        </div>
      </main>
    </div>
  );
};

const SectionLoading = () => (
  <div className="flex min-h-64 items-center justify-center rounded-2xl border border-border/60 bg-card">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
  </div>
);

interface SectionHeaderProps {
  icon: React.ElementType;
  gradient: string;
  title: string;
  description: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon: Icon, gradient, title, description }) => (
  <div className="flex items-center gap-3">
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${gradient}`}>
      <Icon className="h-4 w-4 text-white" />
    </div>
    <div>
      <h2 className="text-lg font-semibold leading-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);

export default Index;
