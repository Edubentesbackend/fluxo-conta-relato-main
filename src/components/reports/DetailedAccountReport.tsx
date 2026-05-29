import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Download, FileSpreadsheet, Users, Calendar, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useAccountBreakdown } from '@/hooks/useAccountBreakdown';
import { Account, Transaction, TRANSACTION_TYPES, TransactionWithRunningBalance } from '@/types/database';
import { formatCurrency } from '@/utils/currency';
import { AdvancedAccountFilters, AccountFilters } from './breakdown/AdvancedAccountFilters';
import { exportDetailedAccountReport, exportDetailedAccountReportToPDF } from './breakdown/DetailedExportHelpers';
import { TransactionDetailModal } from './TransactionDetailModal';
import { BalanceEvolutionSparkline } from './charts/BalanceEvolutionSparkline';
import { CounterpartDistribution } from './charts/CounterpartDistribution';

interface DetailedAccountReportProps {
  selectedAccountId: string | undefined;
  accounts: Account[];
  transactions: Transaction[];
}

export const DetailedAccountReport: React.FC<DetailedAccountReportProps> = ({
  selectedAccountId,
  accounts,
  transactions,
}) => {
  const [expandedCounterpart, setExpandedCounterpart] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithRunningBalance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState<AccountFilters>({
    status: 'all',
    type: 'all',
    minValue: '',
    maxValue: '',
    age: 'all',
    search: '',
  });
  const { toast } = useToast();
  const breakdownData = useAccountBreakdown(selectedAccountId, accounts, transactions);

  const handleTransactionClick = (transaction: TransactionWithRunningBalance) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const getAccountName = (accountId: string) => {
    return accounts.find(a => a.id === accountId)?.name || 'Conta Desconhecida';
  };

  // Apply filters to breakdown data
  const filteredBreakdownData = useMemo(() => {
    if (!breakdownData.account) return breakdownData;

    const filteredCounterparts = breakdownData.counterpartBreakdowns.map(cp => {
      const filteredTransactions = cp.transactions.filter(t => {
        // Status filter
        if (filters.status !== 'all' && t.status !== filters.status) return false;
        
        // Type filter
        if (filters.type !== 'all' && t.transaction_type !== filters.type) return false;
        
        // Min value filter
        if (filters.minValue && Number(t.amount) < Number(filters.minValue)) return false;
        
        // Max value filter
        if (filters.maxValue && Number(t.amount) > Number(filters.maxValue)) return false;
        
        // Age filter
        if (filters.age !== 'all') {
          const daysOld = Math.floor((Date.now() - new Date(t.transaction_date).getTime()) / (1000 * 60 * 60 * 24));
          if (daysOld < Number(filters.age)) return false;
        }
        
        // Search filter
        if (filters.search && !t.description.toLowerCase().includes(filters.search.toLowerCase()) &&
            !t.unique_identifier.toLowerCase().includes(filters.search.toLowerCase())) {
          return false;
        }
        
        return true;
      });

      if (filteredTransactions.length === 0) return null;

      // Recalculate totals and running balance for filtered transactions
      const sortedFiltered = [...filteredTransactions].sort((a, b) => 
        new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
      );
      
      let runningBalance = 0;
      const transactionsWithBalance: TransactionWithRunningBalance[] = sortedFiltered.map(t => {
        const isReceived = t.destination_account_id === selectedAccountId;
        const amount = Number(t.amount);
        
        if (isReceived) {
          runningBalance += amount;
        } else {
          runningBalance -= amount;
        }
        
        return {
          ...t,
          runningBalance,
          balanceChange: isReceived ? 'increase' : 'decrease',
        };
      });
      
      const sent = transactionsWithBalance
        .filter(t => t.source_account_id === selectedAccountId)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const received = transactionsWithBalance
        .filter(t => t.destination_account_id === selectedAccountId)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const pendingReturns = transactionsWithBalance
        .filter(t => 
          t.source_account_id === selectedAccountId && 
          t.transaction_type === 'emprestimo' &&
          (t.status === 'pending_return' || t.status === 'partially_returned')
        )
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const firstTransactionDate = sortedFiltered.length > 0 ? sortedFiltered[0].transaction_date : null;
      const lastTransactionDate = sortedFiltered.length > 0 ? sortedFiltered[sortedFiltered.length - 1].transaction_date : null;

      return {
        ...cp,
        totalSent: sent,
        totalReceived: received,
        pendingReturns,
        transactions: transactionsWithBalance,
        netBalance: received - sent,
        firstTransactionDate,
        lastTransactionDate,
        transactionCount: transactionsWithBalance.length,
      };
    }).filter(Boolean);

    const totalSent = filteredCounterparts.reduce((sum, cp) => sum + (cp?.totalSent || 0), 0);
    const totalReceived = filteredCounterparts.reduce((sum, cp) => sum + (cp?.totalReceived || 0), 0);

    return {
      ...breakdownData,
      counterpartBreakdowns: filteredCounterparts as typeof breakdownData.counterpartBreakdowns,
      totalSent,
      totalReceived,
      netBalance: totalReceived - totalSent,
    };
  }, [breakdownData, filters, selectedAccountId]);

  const handleExport = () => {
    try {
      exportDetailedAccountReport(filteredBreakdownData);
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
      exportDetailedAccountReportToPDF(filteredBreakdownData);
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

  const handleResetFilters = () => {
    setFilters({
      status: 'all',
      type: 'all',
      minValue: '',
      maxValue: '',
      age: 'all',
      search: '',
    });
  };

  if (!selectedAccountId || !filteredBreakdownData.account) {
    return (
      <Card className="shadow-lg border-0 rounded-2xl">
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground text-lg">
            Selecione uma conta para visualizar o relatório detalhado
          </p>
        </CardContent>
      </Card>
    );
  }

  const getPositionBadge = (position: 'devedora' | 'credora' | 'equilibrada') => {
    const variants = {
      credora: { 
        className: 'bg-success/10 text-success border-success/20',
        icon: <TrendingUp className="w-3 h-3" />
      },
      devedora: { 
        className: 'bg-destructive/10 text-destructive border-destructive/20',
        icon: <TrendingDown className="w-3 h-3" />
      },
      equilibrada: { 
        className: 'bg-muted text-muted-foreground border-border',
        icon: <Minus className="w-3 h-3" />
      }
    };

    const variant = variants[position];
    return (
      <Badge className={cn('text-xs font-medium px-2 py-1 flex items-center gap-1', variant.className)}>
        {variant.icon}
        {position.charAt(0).toUpperCase() + position.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'pending_return': { label: 'Pendente', className: 'bg-destructive/10 text-destructive' },
      'partially_returned': { label: 'Parcial', className: 'bg-warning/10 text-warning' },
      'fully_returned': { label: 'Quitado', className: 'bg-success/10 text-success' },
      'completed': { label: 'Completo', className: 'bg-muted text-muted-foreground' },
    };
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.completed;
    return (
      <Badge className={cn('text-xs', statusInfo.className)}>
        {statusInfo.label}
      </Badge>
    );
  };

  const toggleCounterpart = (counterpartId: string) => {
    setExpandedCounterpart(prev => prev === counterpartId ? null : counterpartId);
  };

  // Separate sent and received counterparts
  const sentCounterparts = filteredBreakdownData.counterpartBreakdowns
    .filter(c => c.totalSent > 0)
    .sort((a, b) => b.totalSent - a.totalSent);
  
  const receivedCounterparts = filteredBreakdownData.counterpartBreakdowns
    .filter(c => c.totalReceived > 0)
    .sort((a, b) => b.totalReceived - a.totalReceived);

  return (
    <div className="space-y-6">
      {/* Consolidated Summary Card */}
      <Card className="shadow-lg border-0 rounded-2xl overflow-hidden animate-fade-in">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border/50">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl text-primary">
                {filteredBreakdownData.account.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Conta: {filteredBreakdownData.account.account_number || 'N/A'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {getPositionBadge(filteredBreakdownData.position)}
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExport}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="relative p-4 rounded-lg bg-gradient-to-br from-destructive/5 to-destructive/10 border border-destructive/20">
              <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Total Enviado
              </p>
              <p className="text-3xl font-bold text-foreground">
                {formatCurrency(filteredBreakdownData.totalSent)}
              </p>
            </div>
            <div className="relative p-4 rounded-lg bg-gradient-to-br from-success/5 to-success/10 border border-success/20">
              <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Total Recebido
              </p>
              <p className="text-3xl font-bold text-foreground">
                {formatCurrency(filteredBreakdownData.totalReceived)}
              </p>
            </div>
            <div className="relative p-4 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
              <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Saldo Líquido
              </p>
              <p className={cn(
                "text-3xl font-bold",
                filteredBreakdownData.netBalance > 0 ? "text-success" : 
                filteredBreakdownData.netBalance < 0 ? "text-destructive" : 
                "text-muted-foreground"
              )}>
                {formatCurrency(Math.abs(filteredBreakdownData.netBalance))}
              </p>
            </div>
          </div>
          
          {/* Distribution Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contrapartidas</p>
                <p className="text-lg font-bold">{filteredBreakdownData.totalCounterparts}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Calendar className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Empréstimos Pendentes</p>
                <p className="text-lg font-bold text-warning">{formatCurrency(filteredBreakdownData.pendingLoans)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                filteredBreakdownData.position === 'credora' ? 'bg-success/10' :
                filteredBreakdownData.position === 'devedora' ? 'bg-destructive/10' :
                'bg-muted'
              )}>
                {filteredBreakdownData.position === 'credora' ? (
                  <TrendingUp className={cn("h-5 w-5 text-success")} />
                ) : filteredBreakdownData.position === 'devedora' ? (
                  <TrendingDown className={cn("h-5 w-5 text-destructive")} />
                ) : (
                  <Minus className={cn("h-5 w-5 text-muted-foreground")} />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Posição Geral</p>
                <p className={cn(
                  "text-lg font-bold capitalize",
                  filteredBreakdownData.position === 'credora' ? 'text-success' :
                  filteredBreakdownData.position === 'devedora' ? 'text-destructive' :
                  'text-muted-foreground'
                )}>
                  {filteredBreakdownData.position}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      <AdvancedAccountFilters
        filters={filters}
        onFiltersChange={setFilters}
        onReset={handleResetFilters}
      />

      {/* Counterpart Distribution Visualization */}
      <CounterpartDistribution
        sentData={sentCounterparts.map(c => ({
          name: c.counterpart.name,
          amount: c.totalSent,
          percentage: c.sentPercentage,
          color: 'destructive',
        }))}
        receivedData={receivedCounterparts.map(c => ({
          name: c.counterpart.name,
          amount: c.totalReceived,
          percentage: c.receivedPercentage,
          color: 'success',
        }))}
        totalSent={filteredBreakdownData.totalSent}
        totalReceived={filteredBreakdownData.totalReceived}
      />

      {/* Where Money Went Section */}
      <Card className="shadow-lg border-0 rounded-2xl animate-slide-up">
        <CardHeader className="bg-gradient-to-r from-destructive/5 to-destructive/10 border-b border-border/50">
          <CardTitle className="text-destructive flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Para Onde Foi o Dinheiro ({formatCurrency(filteredBreakdownData.totalSent)})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sentCounterparts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhuma transferência enviada neste período
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Contraparte</TableHead>
                  <TableHead className="text-center">Evolução</TableHead>
                  <TableHead className="text-right">Valor Enviado</TableHead>
                  <TableHead className="text-right">% do Total</TableHead>
                  <TableHead className="text-right">Pendente</TableHead>
                  <TableHead className="text-center">Posição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sentCounterparts.map((counterpart) => (
                  <React.Fragment key={counterpart.counterpart.id}>
                    <TableRow 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleCounterpart(counterpart.counterpart.id)}
                    >
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          {expandedCounterpart === counterpart.counterpart.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>
                          {counterpart.counterpart.name}
                          <div className="text-xs text-muted-foreground">
                            {counterpart.counterpart.account_number}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <BalanceEvolutionSparkline transactions={counterpart.transactions} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-1">
                          <p className="font-medium text-lg">
                            {formatCurrency(counterpart.totalSent)}
                          </p>
                          {/* Progress bar */}
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div 
                              className="bg-destructive h-1.5 rounded-full transition-all"
                              style={{ width: `${counterpart.sentPercentage}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="font-mono">
                          {counterpart.sentPercentage.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-destructive font-medium">
                        {formatCurrency(counterpart.pendingReturns)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getPositionBadge(counterpart.position)}
                      </TableCell>
                    </TableRow>
                    {expandedCounterpart === counterpart.counterpart.id && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/30 p-0">
                          <div className="p-6">
                            {/* Summary Info */}
                            <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-card rounded-lg border">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Período</p>
                                <p className="text-sm font-medium">
                                  {counterpart.firstTransactionDate && counterpart.lastTransactionDate
                                    ? `${format(new Date(counterpart.firstTransactionDate), 'dd/MM/yyyy')} - ${format(new Date(counterpart.lastTransactionDate), 'dd/MM/yyyy')}`
                                    : 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Total Transações</p>
                                <p className="text-sm font-medium">{counterpart.transactionCount}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Status Geral</p>
                                {getPositionBadge(counterpart.position)}
                              </div>
                            </div>

                            <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
                              <Activity className="h-4 w-4" />
                              Transações com Saldo Acumulado:
                            </h4>
                            
                            <div className="space-y-2">
                              {counterpart.transactions
                                .filter(t => t.source_account_id === selectedAccountId)
                                .map((transaction) => (
                                  <div 
                                    key={transaction.id}
                                    onClick={() => handleTransactionClick(transaction)}
                                    className="group flex items-center justify-between p-4 bg-card rounded-lg border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="font-mono text-xs text-muted-foreground">
                                          {transaction.unique_identifier}
                                        </span>
                                        {getStatusBadge(transaction.status)}
                                        <Badge variant="outline" className="text-xs">
                                          {TRANSACTION_TYPES.find(t => t.value === transaction.transaction_type)?.label}
                                        </Badge>
                                      </div>
                                      <p className="text-sm mb-1">{transaction.description}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {format(new Date(transaction.transaction_date), 'dd/MM/yyyy HH:mm')}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-4 ml-4">
                                      <div className="text-right">
                                        <p className="text-xs text-muted-foreground mb-1">Valor</p>
                                        <p className="font-bold text-lg">
                                          {formatCurrency(Number(transaction.amount))}
                                        </p>
                                      </div>
                                      <div className="text-right min-w-[120px]">
                                        <p className="text-xs text-muted-foreground mb-1 flex items-center justify-end gap-1">
                                          {transaction.balanceChange === 'decrease' ? (
                                            <>↘️ Saldo</>
                                          ) : (
                                            <>↗️ Saldo</>
                                          )}
                                        </p>
                                        <p className={cn(
                                          "font-bold text-lg",
                                          transaction.runningBalance > 0 ? "text-success" :
                                          transaction.runningBalance < 0 ? "text-destructive" :
                                          "text-muted-foreground"
                                        )}>
                                          {formatCurrency(Math.abs(transaction.runningBalance))}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>

                            {/* Totals Section */}
                            <div className="mt-4 p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg border-2 border-primary/20">
                              <h4 className="font-bold text-sm mb-3 text-primary">═══ TOTAL CONSOLIDADO ═══</h4>
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Total Enviado</p>
                                  <p className="text-xl font-bold text-destructive">
                                    {formatCurrency(counterpart.totalSent)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Total Recebido</p>
                                  <p className="text-xl font-bold text-success">
                                    {formatCurrency(counterpart.totalReceived)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Posição</p>
                                  <p className={cn(
                                    "text-xl font-bold",
                                    counterpart.netBalance < 0 ? "text-success" : "text-destructive"
                                  )}>
                                    {filteredBreakdownData.account.name} é {counterpart.position.toUpperCase()} de {formatCurrency(Math.abs(counterpart.netBalance))}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Where Money Came From Section */}
      <Card className="shadow-lg border-0 rounded-2xl animate-slide-up">
        <CardHeader className="bg-gradient-to-r from-success/5 to-success/10 border-b border-border/50">
          <CardTitle className="text-success flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            De Onde Veio o Dinheiro ({formatCurrency(filteredBreakdownData.totalReceived)})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {receivedCounterparts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhuma transferência recebida neste período
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Contraparte</TableHead>
                  <TableHead className="text-center">Evolução</TableHead>
                  <TableHead className="text-right">Valor Recebido</TableHead>
                  <TableHead className="text-right">% do Total</TableHead>
                  <TableHead className="text-center">Posição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivedCounterparts.map((counterpart) => (
                  <React.Fragment key={counterpart.counterpart.id}>
                    <TableRow 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleCounterpart(`received-${counterpart.counterpart.id}`)}
                    >
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          {expandedCounterpart === `received-${counterpart.counterpart.id}` ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>
                          {counterpart.counterpart.name}
                          <div className="text-xs text-muted-foreground">
                            {counterpart.counterpart.account_number}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <BalanceEvolutionSparkline transactions={counterpart.transactions} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-1">
                          <p className="font-medium text-lg">
                            {formatCurrency(counterpart.totalReceived)}
                          </p>
                          {/* Progress bar */}
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div 
                              className="bg-success h-1.5 rounded-full transition-all"
                              style={{ width: `${counterpart.receivedPercentage}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="font-mono">
                          {counterpart.receivedPercentage.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {getPositionBadge(counterpart.position)}
                      </TableCell>
                    </TableRow>
                    {expandedCounterpart === `received-${counterpart.counterpart.id}` && (
                      <TableRow>
                        <TableCell colSpan={5} className="bg-muted/30 p-0">
                          <div className="p-6">
                            {/* Summary Info */}
                            <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-card rounded-lg border">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Período</p>
                                <p className="text-sm font-medium">
                                  {counterpart.firstTransactionDate && counterpart.lastTransactionDate
                                    ? `${format(new Date(counterpart.firstTransactionDate), 'dd/MM/yyyy')} - ${format(new Date(counterpart.lastTransactionDate), 'dd/MM/yyyy')}`
                                    : 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Total Transações</p>
                                <p className="text-sm font-medium">{counterpart.transactionCount}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Status Geral</p>
                                {getPositionBadge(counterpart.position)}
                              </div>
                            </div>

                            <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
                              <Activity className="h-4 w-4" />
                              Transações com Saldo Acumulado:
                            </h4>
                            
                            <div className="space-y-2">
                              {counterpart.transactions
                                .filter(t => t.destination_account_id === selectedAccountId)
                                .map((transaction) => (
                                  <div 
                                    key={transaction.id}
                                    onClick={() => handleTransactionClick(transaction)}
                                    className="group flex items-center justify-between p-4 bg-card rounded-lg border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="font-mono text-xs text-muted-foreground">
                                          {transaction.unique_identifier}
                                        </span>
                                        {getStatusBadge(transaction.status)}
                                        <Badge variant="outline" className="text-xs">
                                          {TRANSACTION_TYPES.find(t => t.value === transaction.transaction_type)?.label}
                                        </Badge>
                                      </div>
                                      <p className="text-sm mb-1">{transaction.description}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {format(new Date(transaction.transaction_date), 'dd/MM/yyyy HH:mm')}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-4 ml-4">
                                      <div className="text-right">
                                        <p className="text-xs text-muted-foreground mb-1">Valor</p>
                                        <p className="font-bold text-lg text-success">
                                          {formatCurrency(Number(transaction.amount))}
                                        </p>
                                      </div>
                                      <div className="text-right min-w-[120px]">
                                        <p className="text-xs text-muted-foreground mb-1 flex items-center justify-end gap-1">
                                          {transaction.balanceChange === 'increase' ? (
                                            <>↗️ Saldo</>
                                          ) : (
                                            <>↘️ Saldo</>
                                          )}
                                        </p>
                                        <p className={cn(
                                          "font-bold text-lg",
                                          transaction.runningBalance > 0 ? "text-success" :
                                          transaction.runningBalance < 0 ? "text-destructive" :
                                          "text-muted-foreground"
                                        )}>
                                          {formatCurrency(Math.abs(transaction.runningBalance))}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>

                            {/* Totals Section */}
                            <div className="mt-4 p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg border-2 border-primary/20">
                              <h4 className="font-bold text-sm mb-3 text-primary">═══ TOTAL CONSOLIDADO ═══</h4>
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Total Enviado</p>
                                  <p className="text-xl font-bold text-destructive">
                                    {formatCurrency(counterpart.totalSent)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Total Recebido</p>
                                  <p className="text-xl font-bold text-success">
                                    {formatCurrency(counterpart.totalReceived)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Posição</p>
                                  <p className={cn(
                                    "text-xl font-bold",
                                    counterpart.netBalance < 0 ? "text-success" : "text-destructive"
                                  )}>
                                    {filteredBreakdownData.account.name} é {counterpart.position.toUpperCase()} de {formatCurrency(Math.abs(counterpart.netBalance))}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Results Summary */}
      {(filters.status !== 'all' || filters.type !== 'all' || filters.minValue || filters.maxValue || filters.age !== 'all' || filters.search) && (
        <Card className="shadow-lg border-0 rounded-2xl animate-fade-in">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Mostrando resultados filtrados:
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {sentCounterparts.length + receivedCounterparts.length} contrapartes encontradas
                </p>
              </div>
              <Button variant="outline" onClick={handleResetFilters}>
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sourceName={selectedTransaction ? getAccountName(selectedTransaction.source_account_id) : ''}
        destinationName={selectedTransaction ? getAccountName(selectedTransaction.destination_account_id) : ''}
      />
    </div>
  );
};
