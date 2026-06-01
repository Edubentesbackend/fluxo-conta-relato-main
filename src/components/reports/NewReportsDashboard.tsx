import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, FileText, TrendingUp, TrendingDown, Filter, RefreshCw, Download, Play, Eye, Settings, Bell } from 'lucide-react';

import { KPICards } from './dashboard/KPICards';
import { ActivityChart } from './dashboard/ActivityChart';
import { AdvancedMetrics } from './dashboard/AdvancedMetrics';
import { CEODashboard } from '@/components/dashboard/ProfileDashboards/CEODashboard';
import { CFODashboard } from '@/components/dashboard/ProfileDashboards/CFODashboard';
import { ManagerDashboard } from '@/components/dashboard/ProfileDashboards/ManagerDashboard';
import { AnalystDashboard } from '@/components/dashboard/ProfileDashboards/AnalystDashboard';
import { ExecutiveSummary } from '@/components/dashboard/ExecutiveSummary';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { HeatmapChart } from '@/components/dashboard/HeatmapChart';
import { SecurityIndicator } from '@/components/dashboard/SecurityIndicator';
import { APIStatusMonitor } from '@/components/dashboard/APIStatusMonitor';
import { MultiDashboardSelector, type DashboardProfile } from '@/components/dashboard/MultiDashboardSelector';
import { ExportOptions } from '@/components/dashboard/ExportOptions';
import { GuidedTour, TourTrigger } from '@/components/ui/guided-tour';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { HelpCenter } from '@/components/ui/help-center';
import { PWAInstaller } from '@/components/ui/pwa-installer';
import { AdvancedFilters, AdvancedFiltersData } from './filters/AdvancedFilters';
import { InteractiveTable } from './tables/InteractiveTable';
import { ReturnsTracker } from '@/components/reports/ReturnsTracker';
import { SegregatedBalanceReport } from '@/components/reports/SegregatedBalanceReport';
import { LoansDashboard } from '@/components/reports/LoansDashboard';

import { useTransactionInsights, useMonthlyVolumes, useOptimizedAccountSummaries, useExecutiveInsights } from '@/hooks/useReportsData';
import { useTransactions, TransactionWithAccounts } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { formatCurrency } from '@/utils/currency';
import { TRANSACTION_TYPES, Transaction } from '@/types/database';
import { exportAccountSummariesToExcel, exportTransactionsToExcel, exportInsightsToExcel, exportAccountSummariesToPDF, exportInsightsToPDF } from './export/ExportHelpers';

export const NewReportsDashboard = () => {
  const [filters, setFilters] = useState<AdvancedFiltersData>({});
  const [activeTab, setActiveTab] = useState('loans');
  const [tourOpen, setTourOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<DashboardProfile>("ceo");
  const [showFilters, setShowFilters] = useState(false);
  const queryClient = useQueryClient();
  
  const handleAccountClick = (accountId: string) => {
    setFilters(prev => ({ ...prev, accountId }));
    setActiveTab('transactions');
  };

  // Data hooks
  const { data: insights, isLoading: insightsLoading, refetch: refetchInsights } = useTransactionInsights(filters);
  const { data: executiveInsights, isLoading: executiveInsightsLoading } = useExecutiveInsights(
    filters,
    selectedProfile === 'ceo'
  );
  
  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlyVolumes(filters, 12);
  const { data: accountSummaries, isLoading: summariesLoading } = useOptimizedAccountSummaries(filters);
  const { data: accounts } = useAccounts(true);
  const { data: transactions, isLoading: transactionsLoading } = useTransactions(filters);

  // Account options for filters
  const accountOptions = useMemo(() => {
    return accounts?.map(account => ({
      value: account.id,
      label: `${account.account_number ? `${account.name} (${account.account_number})` : account.name}${account.archived_at ? ' [Arquivada]' : ''}`
    })) || [];
  }, [accounts]);

  // Table columns definitions
  const accountSummaryColumns = [
    {
      key: 'account.name' as keyof any,
      label: 'Conta',
      sortable: true,
      render: (value: any, item: any) => (
        <div>
          <button
            onClick={() => handleAccountClick(item.account.id)}
            className="text-left hover:text-primary transition-colors underline decoration-dotted"
            title="Clique para ver transações desta conta"
          >
            <div className="font-medium">{item.account.name}</div>
            <div className="text-sm text-muted-foreground">
              {item.account.account_number || 'Sem número'}
            </div>
          </button>
        </div>
      )
    },
    {
      key: 'total_entries' as keyof any,
      label: 'Entradas',
      sortable: true,
      render: (value: number) => (
        <span className="text-emerald-600 font-medium">{formatCurrency(value)}</span>
      )
    },
    {
      key: 'total_exits' as keyof any,
      label: 'Saídas',
      sortable: true,
      render: (value: number) => (
        <span className="text-red-600 font-medium">{formatCurrency(value)}</span>
      )
    },
    {
      key: 'net_balance' as keyof any,
      label: 'Saldo Líquido',
      sortable: true,
      render: (value: number) => (
        <span className={`font-bold ${value > 0 ? 'text-emerald-600' : value < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
          {formatCurrency(value)}
        </span>
      )
    },
    {
      key: 'position' as keyof any,
      label: 'Posição',
      render: (value: string) => {
        const colors = {
          devedora: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
          credora: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
          equilibrada: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
        };
        return (
          <Badge className={colors[value as keyof typeof colors] || colors.equilibrada}>
            {value === 'devedora' ? 'Devedora' : value === 'credora' ? 'Credora' : 'Equilibrada'}
          </Badge>
        );
      }
    },
    {
      key: 'total_transactions' as keyof any,
      label: 'Total Transações',
      sortable: true,
      render: (value: number) => (
        <Badge variant="outline">{value}</Badge>
      )
    }
  ];

  const transactionColumns = [
    {
      key: 'transaction_date' as keyof TransactionWithAccounts,
      label: 'Data',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString('pt-BR')
    },
    {
      key: 'unique_identifier' as keyof TransactionWithAccounts,
      label: 'Identificador',
      sortable: true,
      render: (value: string) => (
        <code className="text-xs bg-muted px-2 py-1 rounded">{value}</code>
      )
    },
    {
      key: 'source_account_name' as keyof TransactionWithAccounts,
      label: 'Conta Origem',
      sortable: true,
      render: (value: string, item: TransactionWithAccounts) => (
        <div className="flex flex-col gap-0.5">
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800">
            {value || 'N/A'}
          </Badge>
          {item.source_account_number && (
            <span className="text-xs text-muted-foreground font-mono">{item.source_account_number}</span>
          )}
        </div>
      )
    },
    {
      key: 'destination_account_name' as keyof TransactionWithAccounts,
      label: 'Conta Destino',
      sortable: true,
      render: (value: string, item: TransactionWithAccounts) => (
        <div className="flex flex-col gap-0.5">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">
            {value || 'N/A'}
          </Badge>
          {item.destination_account_number && (
            <span className="text-xs text-muted-foreground font-mono">{item.destination_account_number}</span>
          )}
        </div>
      )
    },
    {
      key: 'amount' as keyof TransactionWithAccounts,
      label: 'Valor',
      sortable: true,
      render: (value: number) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      )
    },
    {
      key: 'transaction_type' as keyof TransactionWithAccounts,
      label: 'Tipo',
      render: (value: string) => {
        const type = TRANSACTION_TYPES.find(t => t.value === value);
        return <Badge variant="secondary">{type?.label || value}</Badge>;
      }
    },
    {
      key: 'description' as keyof TransactionWithAccounts,
      label: 'Descrição',
      render: (value: string) => (
        <span className="text-sm" title={value}>
          {value.length > 40 ? `${value.substring(0, 40)}...` : value}
        </span>
      )
    }
  ];

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleRefresh = () => {
    refetchInsights();
    // Invalidate other queries too
    queryClient.invalidateQueries({ queryKey: ['monthly-volumes'] });
    queryClient.invalidateQueries({ queryKey: ['optimized-account-summaries'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['executive-insights-ai'] });
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  // Tour steps configuration
  const tourSteps = [
    {
      id: "profile-selector",
      title: "Seleção de Perfil",
      content: "Escolha o perfil mais adequado para sua função: CEO para visão estratégica, CFO para análise financeira detalhada, Gerente para operações, ou Analista para dados técnicos.",
      target: "[data-tour='profile-selector']",
      position: "bottom" as const
    },
    {
      id: "executive-summary",
      title: "Resumo Executivo com IA",
      content: "Insights automaticos gerados por Claude para tomada de decisao rapida. Clique no card para expandir e ver mais detalhes.",
      target: "[data-tour='executive-summary']", 
      position: "bottom" as const
    },
    {
      id: "kpi-cards",
      title: "KPIs por Perfil",
      content: "Cada perfil exibe KPIs específicos para sua função. Experimente alternar entre os perfis para ver diferentes métricas.",
      target: "[data-tour='kpi-cards']",
      position: "bottom" as const
    },
    {
      id: "activity-feed",
      title: "Feed de Atividades",
      content: "Acompanhe transações em tempo real com filtros e ordenação.",
      target: "[data-tour='activity-feed']",
      position: "top" as const
    },
    {
      id: "charts",
      title: "Visualizações Interativas",
      content: "Gráficos interativos que mudam conforme seu perfil selecionado.",
      target: "[data-tour='charts']",
      position: "top" as const
    },
    {
      id: "security-indicator",
      title: "Status de Segurança",
      content: "Monitor em tempo real da segurança e compliance do sistema financeiro.",
      target: "[data-tour='security-indicator']",
      position: "top" as const
    },
    {
      id: "export-options",
      title: "Opções de Exportação",
      content: "Exporte dados em Excel ou PDF para análise externa e apresentações.",
      target: "[data-tour='export-options']",
      position: "left" as const
    },
  ];

  return (
      <motion.div
        className="space-y-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
      {/* Header */}
      <Card className="border border-border/70 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="gradient-support rounded-lg p-2 shadow-sm">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">
                  Relatórios financeiros
                </h1>
                <p className="text-sm text-muted-foreground">
                  Consulte empréstimos, saldos e movimentações por conta.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ThemeToggle variant="minimal" />
              <HelpCenter />
              <TourTrigger onStart={() => setTourOpen(true)} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Filtros
              </Button>
              <ExportOptions 
                onExport={(option) => {
                  if (option.id === 'pdf-executive' && insights && monthlyData) {
                    exportInsightsToPDF(insights, monthlyData);
                  } else if (option.id === 'excel-detailed' && insights && monthlyData) {
                    exportInsightsToExcel(insights, monthlyData);
                  }
                }} 
              />
              <Button 
                className="gradient-primary text-white shadow-soft"
                size="sm" 
                onClick={handleRefresh}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AdvancedFilters
              filters={filters}
              onFiltersChange={setFilters}
              accountOptions={accountOptions}
              onClearFilters={handleClearFilters}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-lg border border-border/70 bg-card p-1 shadow-sm lg:grid-cols-4">
          <TabsTrigger
            value="loans"
            className="min-w-0 gap-2 px-2 py-3 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <TrendingDown className="h-4 w-4 shrink-0" />
            Empréstimos
          </TabsTrigger>
          <TabsTrigger
            value="dashboard"
            className="min-w-0 gap-2 px-2 py-3 text-xs sm:text-sm"
          >
            <BarChart3 className="h-4 w-4 shrink-0" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger
            value="accounts"
            className="min-w-0 gap-2 px-2 py-3 text-xs sm:text-sm"
          >
            <FileText className="h-4 w-4 shrink-0" />
            Contas
          </TabsTrigger>
          <TabsTrigger
            value="transactions"
            className="min-w-0 gap-2 px-2 py-3 text-xs sm:text-sm"
          >
            <TrendingUp className="h-4 w-4 shrink-0" />
            Transações
            {filters.accountId && (
              <Badge className="ml-2 gradient-warning text-warning-foreground shadow-soft animate-bounce-subtle">
                Filtradas
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-8 animate-scale-in">
          <motion.div
            data-tour="profile-selector"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <MultiDashboardSelector
              selectedProfile={selectedProfile}
              onProfileChange={setSelectedProfile}
            />
          </motion.div>

          {/* Render different dashboard based on selected profile */}
          {selectedProfile === 'ceo' && (
            <CEODashboard 
              insights={insights ?? {
                total_volume: 0,
                transaction_count: 0,
                avg_transaction_amount: 0,
                most_active_account_name: 'Nenhuma',
                most_active_account_transactions: 0,
                highest_value_transaction_amount: 0,
                most_common_transaction_type: 'emprestimo'
              }}
              monthlyData={monthlyData ?? []}
              transactions={transactions ?? []}
              isLoading={insightsLoading || monthlyLoading}
              aiSummary={executiveInsights?.insights}
              aiLoading={executiveInsightsLoading}
            />
          )}

          {selectedProfile === 'cfo' && (
            <CFODashboard 
              insights={insights ?? {
                total_volume: 0,
                transaction_count: 0,
                avg_transaction_amount: 0,
                most_active_account_name: 'Nenhuma',
                most_active_account_transactions: 0,
                highest_value_transaction_amount: 0,
                most_common_transaction_type: 'emprestimo'
              }}
              monthlyData={monthlyData ?? []}
              isLoading={insightsLoading || monthlyLoading}
            />
          )}

          {selectedProfile === 'manager' && (
            <ManagerDashboard 
              insights={insights ?? {
                total_volume: 0,
                transaction_count: 0,
                avg_transaction_amount: 0,
                most_active_account_name: 'Nenhuma',
                most_active_account_transactions: 0,
                highest_value_transaction_amount: 0,
                most_common_transaction_type: 'emprestimo'
              }}
              monthlyData={monthlyData ?? []}
              transactions={transactions ?? []}
              isLoading={insightsLoading || monthlyLoading}
            />
          )}

          {selectedProfile === 'analyst' && (
            <AnalystDashboard 
              insights={insights ?? {
                total_volume: 0,
                transaction_count: 0,
                avg_transaction_amount: 0,
                most_active_account_name: 'Nenhuma',
                most_active_account_transactions: 0,
                highest_value_transaction_amount: 0,
                most_common_transaction_type: 'emprestimo'
              }}
              monthlyData={monthlyData ?? []}
              transactions={transactions ?? []}
              isLoading={insightsLoading || monthlyLoading || transactionsLoading}
            />
          )}

          {/* Returns Tracker & Segregated Balance - Fase 1 */}
          <div className="space-y-6 animate-fade-in-delayed">
            <ReturnsTracker 
              transactions={transactions ?? []} 
              accounts={accounts ?? []} 
            />
            <SegregatedBalanceReport 
              transactions={transactions ?? []} 
              accounts={accounts ?? []} 
            />
          </div>

          {/* Security & API Status - Common to all profiles */}
          <div className="grid gap-6 lg:grid-cols-2 animate-fade-in-delayed" data-tour="security-indicator">
            <SecurityIndicator />
            <APIStatusMonitor />
          </div>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-8 animate-scale-in">
          <Card className="gradient-card shadow-large border-0 overflow-hidden hover-lift">
            <CardHeader className="bg-gradient-to-r from-accent/5 to-accent/10 border-b border-accent/10">
              <CardTitle className="flex items-center gap-2 text-accent text-xl">
                <FileText className="h-6 w-6" />
                Resumo por Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <InteractiveTable
                title=""
                data={accountSummaries ?? []}
                columns={accountSummaryColumns}
                isLoading={summariesLoading}
                onExport={(selectedData) => {
                  exportAccountSummariesToExcel(selectedData.length > 0 ? selectedData : accountSummaries ?? []);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-8 animate-scale-in">
          <Card className="gradient-card shadow-large border-0 overflow-hidden hover-lift">
            <CardHeader className="bg-gradient-to-r from-support/5 to-support/10 border-b border-support/10">
              <CardTitle className="flex items-center gap-2 text-support text-xl">
                <TrendingUp className="h-6 w-6" />
                Transações Detalhadas
                {filters.accountId && (
                  <Badge className="ml-3 gradient-warning text-warning-foreground shadow-soft animate-bounce-subtle">
                    Conta Filtrada
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <InteractiveTable
                title=""
                data={transactions ?? []}
                columns={transactionColumns}
                isLoading={transactionsLoading}
                onExport={(selectedData) => {
                  exportTransactionsToExcel(selectedData.length > 0 ? selectedData : transactions ?? []);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loans" className="animate-scale-in">
          <LoansDashboard />
        </TabsContent>
      </Tabs>

      <GuidedTour 
        steps={tourSteps}
        isOpen={tourOpen} 
        onClose={() => setTourOpen(false)}
        onComplete={() => console.log('Tour completed!')}
      />
      
      <PWAInstaller />
    </motion.div>
  );
};
