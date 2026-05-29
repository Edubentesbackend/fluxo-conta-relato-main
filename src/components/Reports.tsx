import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Download, Filter, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { TRANSACTION_TYPES, TransactionType, AccountSummary, CounterpartSummary } from '@/types/database';
import { SearchableSelect, SearchableSelectItem } from '@/components/ui/searchable-select';
import { VisualAccountReport } from '@/components/reports/VisualAccountReport';
import { DetailedAccountReport } from '@/components/reports/DetailedAccountReport';
import { exportAccountSummariesToExcel, exportAccountSummariesToPDF } from './reports/Export/ExportHelpers';
import { useToast } from '@/hooks/use-toast';

export const Reports: React.FC = () => {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [transactionType, setTransactionType] = useState<TransactionType>();
  const [selectedAccountId, setSelectedAccountId] = useState<string>();
  const [expandedCounterpart, setExpandedCounterpart] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('general');
  const { toast } = useToast();

  const { data: accounts = [] } = useAccounts();
  const { data: transactions = [] } = useTransactions({
    startDate,
    endDate,
    transactionType,
  });

  const accountSummaries = useMemo((): AccountSummary[] => {
    return accounts.map(account => {
      const entries = transactions
        .filter(t => t.destination_account_id === account.id)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const exits = transactions
        .filter(t => t.source_account_id === account.id)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const netBalance = entries - exits;
      
      let position: 'devedora' | 'credora' | 'equilibrada';
      if (netBalance > 0) position = 'devedora'; // Recebeu mais = deve
      else if (netBalance < 0) position = 'credora'; // Enviou mais = é credor
      else position = 'equilibrada';

      return {
        account,
        totalEntries: entries,
        totalExits: exits,
        netBalance,
        position,
      };
    });
  }, [accounts, transactions]);

  const counterpartSummaries = useMemo((): CounterpartSummary[] => {
    if (!selectedAccountId) return [];

    const counterparts = new Map<string, CounterpartSummary>();
    
    accounts.forEach(account => {
      if (account.id === selectedAccountId) return;
      
      const accountTransactions = transactions.filter(t => 
        (t.source_account_id === selectedAccountId && t.destination_account_id === account.id) ||
        (t.destination_account_id === selectedAccountId && t.source_account_id === account.id)
      );
      
      const totalSent = accountTransactions
        .filter(t => t.source_account_id === selectedAccountId)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const totalReceived = accountTransactions
        .filter(t => t.destination_account_id === selectedAccountId)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const netBalance = totalReceived - totalSent;
      
      let position: 'devedora' | 'credora' | 'equilibrada';
      if (netBalance > 0) position = 'devedora'; // Recebeu mais = deve
      else if (netBalance < 0) position = 'credora'; // Enviou mais = é credor
      else position = 'equilibrada';

      if (accountTransactions.length > 0) {
        counterparts.set(account.id, {
          counterpart: account,
          totalSent,
          totalReceived,
          netBalance,
          position,
          transactions: accountTransactions,
        });
      }
    });

    return Array.from(counterparts.values());
  }, [accounts, transactions, selectedAccountId]);

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Estilo para cabeçalhos
    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '2E7D32' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      }
    };

    // Aba do relatório geral
    const generalData = [
      ['RELATÓRIO GERAL DE CONTAS'],
      [`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
      [],
      ['Conta', 'Número', 'Total de Entradas', 'Total de Saídas', 'Saldo Líquido', 'Posição'],
      ...accountSummaries.map(summary => [
        summary.account.name,
        summary.account.account_number || '',
        parseFloat(summary.totalEntries.toFixed(2)),
        parseFloat(summary.totalExits.toFixed(2)),
        parseFloat(summary.netBalance.toFixed(2)),
        summary.position.toUpperCase()
      ])
    ];

    const generalWs = XLSX.utils.aoa_to_sheet(generalData);
    
    // Configurar larguras das colunas
    const generalColWidths = [
      { wch: 30 }, // Conta
      { wch: 15 }, // Número
      { wch: 18 }, // Entradas
      { wch: 18 }, // Saídas
      { wch: 18 }, // Saldo
      { wch: 15 }  // Posição
    ];
    generalWs['!cols'] = generalColWidths;

    // Configurar formato de moeda para colunas numéricas
    const range = XLSX.utils.decode_range(generalWs['!ref'] || 'A1');
    for (let R = 4; R <= range.e.r; R++) { // Começar da linha 5 (índice 4)
      for (let C = 2; C <= 4; C++) { // Colunas C, D, E (entradas, saídas, saldo)
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (generalWs[cellAddress] && typeof generalWs[cellAddress].v === 'number') {
          generalWs[cellAddress].z = 'R$ #,##0.00';
        }
      }
    }

    // Congelar primeira linha de dados
    generalWs['!freeze'] = { xSplit: 0, ySplit: 4 };

    XLSX.utils.book_append_sheet(wb, generalWs, 'Relatório Geral');

    // Aba do relatório por conta
    if (selectedAccountId && counterpartSummaries.length > 0) {
      const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
      
      const counterpartData = [
        [`RELATÓRIO DETALHADO - ${selectedAccount?.name?.toUpperCase() || ''}`],
        [`Número da Conta: ${selectedAccount?.account_number || 'N/A'}`],
        [`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
        [],
        ['Contraparte', 'Número', 'Total Enviado', 'Total Recebido', 'Saldo Líquido', 'Posição', 'Qtd. Transações'],
        ...counterpartSummaries.map(summary => [
          summary.counterpart.name,
          summary.counterpart.account_number || '',
          parseFloat(summary.totalSent.toFixed(2)),
          parseFloat(summary.totalReceived.toFixed(2)),
          parseFloat(summary.netBalance.toFixed(2)),
          summary.position.toUpperCase(),
          summary.transactions.length
        ])
      ];

      const counterpartWs = XLSX.utils.aoa_to_sheet(counterpartData);
      
      // Configurar larguras das colunas
      const counterpartColWidths = [
        { wch: 30 }, // Contraparte
        { wch: 15 }, // Número
        { wch: 18 }, // Enviado
        { wch: 18 }, // Recebido
        { wch: 18 }, // Saldo
        { wch: 15 }, // Posição
        { wch: 18 }  // Transações
      ];
      counterpartWs['!cols'] = counterpartColWidths;

      // Configurar formato de moeda
      const counterRange = XLSX.utils.decode_range(counterpartWs['!ref'] || 'A1');
      for (let R = 5; R <= counterRange.e.r; R++) {
        for (let C = 2; C <= 4; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (counterpartWs[cellAddress] && typeof counterpartWs[cellAddress].v === 'number') {
            counterpartWs[cellAddress].z = 'R$ #,##0.00';
          }
        }
      }

      counterpartWs['!freeze'] = { xSplit: 0, ySplit: 5 };
      XLSX.utils.book_append_sheet(wb, counterpartWs, `Análise ${selectedAccount?.name?.substring(0, 20) || 'Conta'}`);

      // Adicionar transações detalhadas
      const detailedData = [
        ['TRANSAÇÕES DETALHADAS'],
        [`Conta: ${selectedAccount?.name || ''} (${selectedAccount?.account_number || ''})`],
        [`Período: ${startDate ? format(startDate, 'dd/MM/yyyy') : 'Início'} a ${endDate ? format(endDate, 'dd/MM/yyyy') : 'Hoje'}`],
        [],
        ['Identificador', 'Data', 'Conta Origem', 'Conta Destino', 'Contraparte', 'Valor', 'Tipo', 'Descrição']
      ];

      counterpartSummaries.forEach(summary => {
        summary.transactions.forEach(transaction => {
          const sourceAccount = accounts.find(acc => acc.id === transaction.source_account_id);
          const destAccount = accounts.find(acc => acc.id === transaction.destination_account_id);
          
          detailedData.push([
            transaction.unique_identifier,
            format(new Date(transaction.transaction_date), 'dd/MM/yyyy'),
            `${sourceAccount?.account_number || ''} - ${sourceAccount?.name || ''}`,
            `${destAccount?.account_number || ''} - ${destAccount?.name || ''}`,
            summary.counterpart.name,
            Number(transaction.amount).toFixed(2),
            TRANSACTION_TYPES.find(t => t.value === transaction.transaction_type)?.label || '',
            transaction.description,
          ]);
        });
      });

      if (detailedData.length > 5) {
        const detailedWs = XLSX.utils.aoa_to_sheet(detailedData);
        
        // Larguras das colunas para transações
        detailedWs['!cols'] = [
          { wch: 20 }, // Identificador
          { wch: 12 }, // Data
          { wch: 25 }, // Origem
          { wch: 25 }, // Destino
          { wch: 20 }, // Contraparte
          { wch: 15 }, // Valor
          { wch: 20 }, // Tipo
          { wch: 40 }  // Descrição
        ];

        // Formato de moeda para valores
        const detailedRange = XLSX.utils.decode_range(detailedWs['!ref'] || 'A1');
        for (let R = 5; R <= detailedRange.e.r; R++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: 5 }); // Coluna F (valor)
          if (detailedWs[cellAddress] && typeof detailedWs[cellAddress].v === 'number') {
            detailedWs[cellAddress].z = 'R$ #,##0.00';
          }
        }

        detailedWs['!freeze'] = { xSplit: 0, ySplit: 5 };
        XLSX.utils.book_append_sheet(wb, detailedWs, 'Transações Detalhadas');
      }
    }

    const fileName = `relatorio_transacoes_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setTransactionType(undefined);
  };

  const getPositionBadge = (position: 'devedora' | 'credora' | 'equilibrada') => {
    const variants = {
      credora: { 
        className: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
        icon: <TrendingUp className="w-3 h-3" />
      },
      devedora: { 
        className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
        icon: <TrendingDown className="w-3 h-3" />
      },
      equilibrada: { 
        className: 'bg-muted text-muted-foreground border-border hover:bg-muted/80',
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Prepare transaction type options
  const transactionTypeOptions: SearchableSelectItem[] = TRANSACTION_TYPES.map(type => ({
    value: type.value,
    label: type.label
  }));

  // Prepare account options for SearchableSelect
  const accountOptions: SearchableSelectItem[] = accounts.map(account => ({
    value: account.id,
    label: `${account.account_number || ''} - ${account.name}`,
    searchLabel: `${account.account_number || ''} ${account.name}`.toLowerCase()
  }));

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="shadow-lg border-0 rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border/50">
          <CardTitle className="flex items-center gap-3 text-primary">
            <Filter className="h-5 w-5" />
            Filtros de Relatório
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Data Inicial</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal rounded-xl border-2 h-11",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    className="rounded-xl"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Data Final</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal rounded-xl border-2 h-11",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    className="rounded-xl"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Tipo de Transação</label>
              <SearchableSelect
                value={transactionType || ''}
                onValueChange={(value) => setTransactionType(value as TransactionType || undefined)}
                items={[{ value: '', label: 'Todos os tipos' }, ...transactionTypeOptions]}
                placeholder="Selecionar tipo..."
                searchPlaceholder="Buscar tipo de transação"
                emptyMessage="Nenhum tipo encontrado."
                className="rounded-xl"
              />
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={clearFilters} 
                className="w-full rounded-xl border-2 font-medium hover:bg-secondary/50 transition-all duration-200"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <TabsList className="grid w-full md:w-auto grid-cols-4 rounded-xl">
            <TabsTrigger value="general" className="rounded-lg">Relatório Geral</TabsTrigger>
            <TabsTrigger value="by-account" className="rounded-lg">Por Conta</TabsTrigger>
            <TabsTrigger value="visual" className="rounded-lg">Visual</TabsTrigger>
            <TabsTrigger value="detailed" className="rounded-lg">Detalhado</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <Button 
              onClick={exportToExcel}
              variant="outline"
              className="flex items-center gap-2 font-medium rounded-xl px-6 py-2 shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Download className="h-4 w-4" />
              Excel
            </Button>
            <Button 
              onClick={() => {
                const exportData = accountSummaries.map(summary => ({
                  account: summary.account,
                  total_entries: summary.totalEntries,
                  total_exits: summary.totalExits,
                  net_balance: summary.netBalance,
                  position: summary.position,
                  total_transactions: transactions.filter(t => 
                    t.source_account_id === summary.account.id || t.destination_account_id === summary.account.id
                  ).length
                }));
                exportAccountSummariesToPDF(exportData);
                toast({
                  title: "PDF exportado!",
                  description: "Relatório exportado em PDF com sucesso."
                });
              }}
              className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white font-medium rounded-xl px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>

        <TabsContent value="general">
          <Card className="shadow-lg border-0 rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border/50">
              <CardTitle className="text-primary">Resumo por Conta</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Análise consolidada de entradas, saídas e posições de todas as contas
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30 sticky top-0">
                    <TableRow className="border-b-2 border-border/50">
                      <TableHead className="font-semibold text-foreground px-6 py-4">Conta</TableHead>
                      <TableHead className="text-right font-semibold text-foreground px-6 py-4">Entradas</TableHead>
                      <TableHead className="text-right font-semibold text-foreground px-6 py-4">Saídas</TableHead>
                      <TableHead className="text-right font-semibold text-foreground px-6 py-4">Saldo Líquido</TableHead>
                      <TableHead className="text-center font-semibold text-foreground px-6 py-4">Posição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountSummaries.map((summary, index) => (
                       <TableRow 
                        key={summary.account.id} 
                        className={cn(
                          'hover:bg-muted/30 transition-colors duration-150 cursor-pointer',
                          index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                        )}
                        onClick={() => {
                          setSelectedAccountId(summary.account.id);
                          setActiveTab('by-account');
                        }}
                      >
                        <TableCell className="font-medium px-6 py-4">
                          <div className="space-y-1">
                            <div className="font-semibold text-foreground">{summary.account.name}</div>
                            {summary.account.account_number && (
                              <div className="text-xs text-muted-foreground">{summary.account.account_number}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-6 py-4">
                          <span className="font-medium text-success">
                            {formatCurrency(summary.totalEntries)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right px-6 py-4">
                          <span className="font-medium text-destructive">
                            {formatCurrency(summary.totalExits)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right px-6 py-4">
                          <span className={cn(
                            "font-bold text-lg",
                            summary.netBalance > 0 ? "text-success" : 
                            summary.netBalance < 0 ? "text-destructive" : "text-muted-foreground"
                          )}>
                            {formatCurrency(summary.netBalance)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center px-6 py-4">
                          {getPositionBadge(summary.position)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-account">
          <div className="space-y-6">
            <Card className="shadow-lg border-0 rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-support/10 to-primary/10 border-b border-border/50">
                <CardTitle className="text-support">Selecionar Conta para Análise</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <SearchableSelect
                  value={selectedAccountId || ''}
                  onValueChange={setSelectedAccountId}
                  items={accountOptions}
                  placeholder="Buscar conta para análise..."
                  searchPlaceholder="Digite o número ou nome da conta"
                  emptyMessage="Nenhuma conta encontrada."
                  className="rounded-xl"
                />
              </CardContent>
            </Card>

            {selectedAccountId && counterpartSummaries.length > 0 && (
              <Card className="shadow-lg border-0 rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-support/10 to-primary/10 border-b border-border/50">
                  <CardTitle className="text-support">
                    Análise de Contrapartes - {accounts.find(acc => acc.id === selectedAccountId)?.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Relacionamento financeiro com outras contas
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/30 sticky top-0">
                        <TableRow className="border-b-2 border-border/50">
                          <TableHead className="font-semibold text-foreground px-6 py-4">Contraparte</TableHead>
                          <TableHead className="text-right font-semibold text-foreground px-6 py-4">Enviado</TableHead>
                          <TableHead className="text-right font-semibold text-foreground px-6 py-4">Recebido</TableHead>
                          <TableHead className="text-right font-semibold text-foreground px-6 py-4">Saldo Líquido</TableHead>
                          <TableHead className="text-center font-semibold text-foreground px-6 py-4">Posição</TableHead>
                          <TableHead className="text-right font-semibold text-foreground px-6 py-4">Transações</TableHead>
                        </TableRow>
                      </TableHeader>
                       <TableBody>
                        {counterpartSummaries.map((summary, index) => (
                          <React.Fragment key={summary.counterpart.id}>
                            <TableRow 
                              className={cn(
                                'hover:bg-muted/30 transition-colors duration-150 cursor-pointer',
                                index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                              )}
                              onClick={() => setExpandedCounterpart(
                                expandedCounterpart === summary.counterpart.id ? null : summary.counterpart.id
                              )}
                            >
                              <TableCell className="font-medium px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="space-y-1 flex-1">
                                    <div className="font-semibold text-foreground">{summary.counterpart.name}</div>
                                    {summary.counterpart.account_number && (
                                      <div className="text-xs text-muted-foreground">{summary.counterpart.account_number}</div>
                                    )}
                                  </div>
                                  {expandedCounterpart === summary.counterpart.id ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right px-6 py-4">
                                <span className="font-medium text-destructive">
                                  {formatCurrency(summary.totalSent)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right px-6 py-4">
                                <span className="font-medium text-success">
                                  {formatCurrency(summary.totalReceived)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right px-6 py-4">
                                <span className={cn(
                                  "font-bold text-lg",
                                  summary.netBalance > 0 ? "text-success" : 
                                  summary.netBalance < 0 ? "text-destructive" : "text-muted-foreground"
                                )}>
                                  {formatCurrency(summary.netBalance)}
                                </span>
                              </TableCell>
                              <TableCell className="text-center px-6 py-4">
                                {getPositionBadge(summary.position)}
                              </TableCell>
                              <TableCell className="text-right px-6 py-4">
                                <Badge variant="secondary" className="font-medium">
                                  {summary.transactions.length}
                                </Badge>
                              </TableCell>
                            </TableRow>
                            
                            {expandedCounterpart === summary.counterpart.id && (
                              <TableRow className="bg-muted/20">
                                <TableCell colSpan={6} className="p-0">
                                  <div className="px-6 py-4 border-t border-border/50">
                                    <h4 className="font-semibold text-sm text-foreground mb-3">
                                      Detalhamento das Transações ({summary.transactions.length})
                                    </h4>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                      {summary.transactions
                                        .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
                                        .map((transaction) => {
                                          const isOutgoing = transaction.source_account_id === selectedAccountId;
                                          const transactionTypeLabel = TRANSACTION_TYPES.find(t => t.value === transaction.transaction_type)?.label || transaction.transaction_type;
                                          
                                          return (
                                            <div 
                                              key={transaction.id} 
                                              className="flex items-center justify-between p-3 bg-background rounded-lg border border-border/30 hover:border-border/50 transition-colors"
                                            >
                                              <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                                                    {transaction.unique_identifier}
                                                  </span>
                                                  <Badge 
                                                    variant="outline" 
                                                    className={cn(
                                                      "text-xs",
                                                      isOutgoing ? "text-destructive border-destructive/30" : "text-success border-success/30"
                                                    )}
                                                  >
                                                    {isOutgoing ? 'Saída' : 'Entrada'}
                                                  </Badge>
                                                </div>
                                                <div className="text-sm text-foreground">
                                                  {transaction.description}
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                  <span>{format(new Date(transaction.transaction_date), 'dd/MM/yyyy')}</span>
                                                  <span>{transactionTypeLabel}</span>
                                                </div>
                                              </div>
                                              <div className="text-right">
                                                <div className={cn(
                                                  "font-bold text-lg",
                                                  isOutgoing ? "text-destructive" : "text-success"
                                                )}>
                                                  {isOutgoing ? '-' : '+'}{formatCurrency(Number(transaction.amount))}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="visual">
          <VisualAccountReport 
            selectedAccountId={selectedAccountId}
            accounts={accounts}
            transactions={transactions}
          />
        </TabsContent>

        <TabsContent value="detailed">
          <DetailedAccountReport 
            selectedAccountId={selectedAccountId}
            accounts={accounts}
            transactions={transactions}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};