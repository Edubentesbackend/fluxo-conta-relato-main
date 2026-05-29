import React from 'react';
import { TrendingUp, TrendingDown, Minus, Users, AlertCircle, Download, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAccountBreakdown } from '@/hooks/useAccountBreakdown';
import { Account, Transaction } from '@/types/database';
import { formatCurrency } from '@/utils/currency';
import { DistributionPieChart } from './charts/DistributionPieChart';
import { ComparisonBarChart } from './charts/ComparisonBarChart';
import { BalanceTimelineChart } from './charts/BalanceTimelineChart';
import { exportDetailedAccountReport, exportDetailedAccountReportToPDF } from './export/DetailedExportHelpers';
import { useToast } from '@/hooks/use-toast';

interface VisualAccountReportProps {
  selectedAccountId: string | undefined;
  accounts: Account[];
  transactions: Transaction[];
}

export const VisualAccountReport: React.FC<VisualAccountReportProps> = ({
  selectedAccountId,
  accounts,
  transactions,
}) => {
  const breakdownData = useAccountBreakdown(selectedAccountId, accounts, transactions);
  const { toast } = useToast();

  const handleExportExcel = () => {
    try {
      exportDetailedAccountReport(breakdownData);
      toast({
        title: "Excel exportado com sucesso!",
        description: "O arquivo Excel foi baixado para seu computador.",
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível exportar o relatório. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    try {
      exportDetailedAccountReportToPDF(breakdownData);
      toast({
        title: "PDF exportado com sucesso!",
        description: "O arquivo PDF foi baixado para seu computador.",
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível exportar o relatório. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (!selectedAccountId || !breakdownData.account) {
    return (
      <Card className="shadow-lg border-0 rounded-2xl">
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground text-lg">
            Selecione uma conta para visualizar o relatório visual
          </p>
        </CardContent>
      </Card>
    );
  }

  const getPositionVariant = (position: 'devedora' | 'credora' | 'equilibrada') => {
    const variants = {
      credora: { 
        className: 'bg-success/10 text-success border-success/20',
        icon: <TrendingUp className="w-4 h-4" />
      },
      devedora: { 
        className: 'bg-destructive/10 text-destructive border-destructive/20',
        icon: <TrendingDown className="w-4 h-4" />
      },
      equilibrada: { 
        className: 'bg-muted text-muted-foreground border-border',
        icon: <Minus className="w-4 h-4" />
      }
    };
    return variants[position];
  };

  const positionVariant = getPositionVariant(breakdownData.position);

  return (
    <div className="space-y-6">
      {/* Account Summary Header */}
      <Card className="shadow-lg border-0 rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border/50">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl text-primary">
                {breakdownData.account.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {breakdownData.account.account_number || 'Sem número'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn('text-sm font-medium px-3 py-1.5 flex items-center gap-2', positionVariant.className)}>
                {positionVariant.icon}
                {breakdownData.position.charAt(0).toUpperCase() + breakdownData.position.slice(1)}
              </Badge>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExportExcel}
                className="gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
              <Button 
                size="sm"
                onClick={handleExportPDF}
                className="gap-2 bg-accent hover:bg-accent/90"
              >
                <Download className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Saldo Líquido</p>
              <p className={cn(
                "text-2xl font-bold",
                breakdownData.netBalance > 0 ? "text-success" : 
                breakdownData.netBalance < 0 ? "text-destructive" : 
                "text-muted-foreground"
              )}>
                {formatCurrency(Math.abs(breakdownData.netBalance))}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Enviado</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(breakdownData.totalSent)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Recebido</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(breakdownData.totalReceived)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-lg border-0 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Transferido</p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(breakdownData.totalSent)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-success/10">
                <TrendingDown className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Devolvido</p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(breakdownData.totalReceived)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-accent/10">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Contrapartes Ativas</p>
                <p className="text-xl font-bold text-foreground">
                  {breakdownData.totalCounterparts}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Empréstimos Pendentes</p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(breakdownData.pendingLoans)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution Pie Chart */}
        <Card className="shadow-lg border-0 rounded-2xl animate-fade-in">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border/50">
            <CardTitle className="text-primary">Distribuição de Envios</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <DistributionPieChart
              data={breakdownData.counterpartBreakdowns
                .filter(cp => cp.totalSent > 0)
                .map(cp => ({
                  name: cp.counterpart.name,
                  value: cp.totalSent,
                  percentage: cp.sentPercentage,
                }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 6)
              }
            />
          </CardContent>
        </Card>

        {/* Comparison Bar Chart */}
        <Card className="shadow-lg border-0 rounded-2xl animate-fade-in">
          <CardHeader className="bg-gradient-to-r from-success/10 to-accent/10 border-b border-border/50">
            <CardTitle className="text-success">Top 5 Contrapartes</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ComparisonBarChart
              data={breakdownData.counterpartBreakdowns
                .sort((a, b) => (b.totalSent + b.totalReceived) - (a.totalSent + a.totalReceived))
                .slice(0, 5)
                .map(cp => ({
                  name: cp.counterpart.name.length > 15 
                    ? cp.counterpart.name.substring(0, 15) + '...' 
                    : cp.counterpart.name,
                  sent: cp.totalSent,
                  received: cp.totalReceived,
                }))
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* Balance Timeline */}
      <Card className="shadow-lg border-0 rounded-2xl animate-fade-in">
        <CardHeader className="bg-gradient-to-r from-accent/10 to-support/10 border-b border-border/50">
          <CardTitle className="text-accent">Evolução do Saldo</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <BalanceTimelineChart
            data={(() => {
              // Process transactions to create timeline data
              const monthlyData = new Map<string, { sent: number; received: number }>();
              
              breakdownData.counterpartBreakdowns.forEach(cp => {
                cp.transactions.forEach(t => {
                  const monthKey = new Date(t.transaction_date).toISOString().substring(0, 7);
                  const existing = monthlyData.get(monthKey) || { sent: 0, received: 0 };
                  
                  if (t.source_account_id === breakdownData.account?.id) {
                    existing.sent += Number(t.amount);
                  } else {
                    existing.received += Number(t.amount);
                  }
                  
                  monthlyData.set(monthKey, existing);
                });
              });

              // Convert to timeline format with cumulative balance
              let cumulativeBalance = 0;
              return Array.from(monthlyData.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([date, values]) => {
                  cumulativeBalance += values.received - values.sent;
                  return {
                    date,
                    balance: cumulativeBalance,
                    sent: values.sent,
                    received: values.received,
                  };
                });
            })()}
          />
        </CardContent>
      </Card>
    </div>
  );
};
