import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { 
  CalendarIcon, 
  ArrowUpDown, 
  TrendingUp, 
  TrendingDown, 
  Receipt,
  Download,
  Building2,
  Hash,
  X
} from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { TransactionWithAccounts } from '@/hooks/useTransactions';
import { TRANSACTION_TYPES } from '@/types/database';

interface BankStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodData: {
    month: string;
    year: string;
    transactions: TransactionWithAccounts[];
    totalVolume: number;
    transactionCount: number;
  } | null;
}

export const BankStatementModal = ({ isOpen, onClose, periodData }: BankStatementModalProps) => {
  if (!periodData) return null;

  const { month, year, transactions, totalVolume, transactionCount } = periodData;

  // Agrupar transações por data
  const transactionsByDate = transactions.reduce((acc, transaction) => {
    const iso = String(transaction.transaction_date);
    const dateKey = iso.slice(0, 10); // YYYY-MM-DD
    const date = `${dateKey.slice(8,10)}/${dateKey.slice(5,7)}/${dateKey.slice(0,4)}`;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(transaction);
    return acc;
  }, {} as Record<string, TransactionWithAccounts[]>);

  // Ordenar datas em ordem decrescente
  const sortedDates = Object.keys(transactionsByDate).sort((a, b) => {
    return new Date(b.split('/').reverse().join('-')).getTime() - 
           new Date(a.split('/').reverse().join('-')).getTime();
  });

  const calculateRunningBalance = () => {
    let balance = 0;
    const balances: Record<string, number> = {};
    
    // Calcular saldo corrido (ordem cronológica inversa para simular extrato)
    sortedDates.reverse().forEach(date => {
      transactionsByDate[date].forEach(transaction => {
        balance += transaction.amount;
      });
      balances[date] = balance;
    });
    
    return balances;
  };

  const balances = calculateRunningBalance();
  sortedDates.reverse(); // Voltar para ordem decrescente para exibição

  const exportStatement = () => {
    // Lógica de exportação do extrato
    console.log('Exportando extrato...', periodData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-5xl max-h-[95vh] overflow-hidden gradient-card shadow-large border-0">
        <DialogHeader className="space-y-4 pb-6">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-3xl font-bold">
              <div className="gradient-primary p-3 rounded-xl shadow-glow">
                <Receipt className="h-7 w-7 text-white" />
              </div>
              <span className="bg-gradient-to-r from-primary via-accent to-support bg-clip-text text-transparent">
                Extrato Bancário - {month}/{year}
              </span>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button 
                onClick={exportStatement}
                className="gradient-accent text-white shadow-soft hover:shadow-glow transition-all duration-300 hover:scale-105"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
              <Button 
                onClick={onClose}
                variant="outline"
                size="sm"
                className="hover:bg-destructive hover:text-white transition-all duration-300"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Resumo do período */}
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-3 gap-4">
            <div className="gradient-primary p-6 rounded-2xl shadow-glow text-white">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="h-6 w-6" />
                <span className="text-lg font-medium">Volume Total</span>
              </div>
              <p className="text-3xl font-bold">{formatCurrency(totalVolume)}</p>
              <p className="text-white/80 text-sm mt-1">Movimentação do período</p>
            </div>
            
            <div className="gradient-accent p-6 rounded-2xl shadow-glow text-white">
              <div className="flex items-center gap-3 mb-3">
                <ArrowUpDown className="h-6 w-6" />
                <span className="text-lg font-medium">Transações</span>
              </div>
              <p className="text-3xl font-bold">{transactionCount}</p>
              <p className="text-white/80 text-sm mt-1">Operações realizadas</p>
            </div>
            
            <div className="gradient-warning p-6 rounded-2xl shadow-glow text-warning-foreground">
              <div className="flex items-center gap-3 mb-3">
                <CalendarIcon className="h-6 w-6" />
                <span className="text-lg font-medium">Média Diária</span>
              </div>
              <p className="text-3xl font-bold">
                {formatCurrency(totalVolume / (sortedDates.length || 1))}
              </p>
              <p className="text-warning-foreground/80 text-sm mt-1">Volume médio por dia</p>
            </div>
          </div>
        </DialogHeader>

        <Separator className="my-6" />

        <ScrollArea className="max-h-[55vh] pr-4">
          <div className="space-y-8">
            {sortedDates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma transação encontrada para este período</p>
              </div>
            ) : (
              sortedDates.map((date) => (
                <div key={date} className="space-y-4 animate-scale-in">
                  {/* Header da data */}
                  <div className="flex items-center justify-between gradient-card p-4 rounded-xl shadow-medium hover-lift">
                    <div className="flex items-center gap-3">
                      <div className="gradient-primary p-2 rounded-lg">
                        <CalendarIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <span className="font-bold text-lg text-foreground">{date}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className="gradient-accent text-white shadow-soft">
                            {transactionsByDate[date].length} transações
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {transactionsByDate[date].reduce((sum, t) => sum + Math.abs(t.amount), 0) > 0 
                              ? formatCurrency(transactionsByDate[date].reduce((sum, t) => sum + Math.abs(t.amount), 0))
                              : 'R$ 0,00'
                            }
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-muted-foreground">Saldo acumulado</span>
                      <p className="text-xl font-bold text-primary">{formatCurrency(balances[date])}</p>
                    </div>
                  </div>

                  {/* Transações da data */}
                  <div className="space-y-3 ml-8">
                    {transactionsByDate[date]
                      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
                      .map((transaction) => {
                        const transactionType = TRANSACTION_TYPES.find(t => t.value === transaction.transaction_type);
                        const isPositive = transaction.amount > 0;
                        
                        return (
                           <div
                             key={transaction.id}
                             className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 gradient-card rounded-xl shadow-soft hover-lift transition-all duration-300 border border-border/50 gap-4 sm:gap-0 touch-manipulation"
                           >
                            <div className="flex items-center gap-4 flex-1">
                              {/* Ícone da transação */}
                              <div className={`p-3 rounded-xl shadow-soft ${
                                isPositive 
                                  ? 'gradient-success text-white' 
                                  : 'gradient-destructive text-white'
                              }`}>
                                {isPositive ? (
                                  <TrendingUp className="h-5 w-5" />
                                ) : (
                                  <TrendingDown className="h-5 w-5" />
                                )}
                              </div>
                              
                              {/* Detalhes da transação */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <p className="font-semibold text-lg text-foreground truncate">
                                    {transaction.description}
                                  </p>
                                  <Badge className="shrink-0 gradient-support text-white shadow-soft">
                                    {transactionType?.label || transaction.transaction_type}
                                  </Badge>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-destructive" />
                                    <span className="font-medium">De:</span>
                                    <span className="truncate">{transaction.source_account_name || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-success" />
                                    <span className="font-medium">Para:</span>
                                    <span className="truncate">{transaction.destination_account_name || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Hash className="h-4 w-4" />
                                    <span className="font-medium">ID:</span>
                                    <code className="text-xs bg-muted px-2 py-1 rounded truncate">
                                      {transaction.unique_identifier}
                                    </code>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                             {/* Valor */}
                             <div className="text-right sm:text-right text-left w-full sm:w-auto">
                              <p className={`text-2xl font-bold ${
                                isPositive ? 'text-success' : 'text-destructive'
                              }`}>
                                {isPositive ? '+' : ''} {formatCurrency(transaction.amount)}
                              </p>
                              <div className="flex flex-col items-end gap-1 mt-1">
                                <p className="text-sm text-muted-foreground">
                                  {new Date(transaction.transaction_date).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                                <Badge variant="outline" className="text-xs">
                                  {isPositive ? 'Entrada' : 'Saída'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};