import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { TrendingDown, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TransactionWithAccounts } from '@/hooks/useTransactions';
import { Account } from '@/types/database';
import { cn } from '@/lib/utils';

interface ReturnsTrackerProps {
  transactions: TransactionWithAccounts[];
  accounts: Account[];
}

interface LoanWithReturns {
  loan: TransactionWithAccounts;
  returns: TransactionWithAccounts[];
  totalReturned: number;
  returnPercentage: number;
  pendingAmount: number;
}

export const ReturnsTracker: React.FC<ReturnsTrackerProps> = ({ transactions, accounts }) => {
  const loansWithReturns = useMemo((): LoanWithReturns[] => {
    // Filter only loans (emprestimo) that need tracking
    const loans = transactions.filter(
      t => t.transaction_type === 'emprestimo' && 
           (t.status === 'pending_return' || 
            t.status === 'partially_returned' || 
            t.status === 'fully_returned')
    );

    return loans.map(loan => {
      // Find all return transactions linked to this loan
      const returns = transactions.filter(
        t => t.parent_transaction_id === loan.id && t.transaction_type === 'devolucao'
      );

      const totalReturned = returns.reduce((sum, r) => sum + Number(r.amount), 0);
      const loanAmount = Number(loan.amount);
      const returnPercentage = loanAmount > 0 ? (totalReturned / loanAmount) * 100 : 0;
      const pendingAmount = loanAmount - totalReturned;

      return {
        loan,
        returns,
        totalReturned,
        returnPercentage,
        pendingAmount,
      };
    });
  }, [transactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending_return: {
        className: 'bg-destructive/10 text-destructive border-destructive/20',
        icon: <Clock className="w-3 h-3" />,
        label: 'Pendente'
      },
      partially_returned: {
        className: 'bg-warning/10 text-warning border-warning/20',
        icon: <AlertCircle className="w-3 h-3" />,
        label: 'Parcial'
      },
      fully_returned: {
        className: 'bg-success/10 text-success border-success/20',
        icon: <CheckCircle2 className="w-3 h-3" />,
        label: 'Quitado'
      },
    };

    const variant = variants[status as keyof typeof variants] || variants.pending_return;
    
    return (
      <Badge className={cn('text-xs font-medium px-2 py-1 flex items-center gap-1', variant.className)}>
        {variant.icon}
        {variant.label}
      </Badge>
    );
  };

  if (loansWithReturns.length === 0) {
    return (
      <CollapsibleCard
        title="Rastreamento de Devoluções"
        icon={<TrendingDown className="h-5 w-5 text-primary" />}
        defaultOpen={false}
      >
        <div className="text-center py-8 text-muted-foreground">
          Nenhum empréstimo com devoluções pendentes
        </div>
      </CollapsibleCard>
    );
  }

  return (
    <CollapsibleCard
      title="Rastreamento de Devoluções"
      icon={<TrendingDown className="h-5 w-5 text-primary" />}
      badge={
        <Badge variant="secondary" className="ml-2">
          {loansWithReturns.filter(l => l.loan.status === 'pending_return' || l.loan.status === 'partially_returned').length} pendentes
        </Badge>
      }
      defaultOpen={true}
    >
      <div className="space-y-4">
        {loansWithReturns.map(({ loan, returns, totalReturned, returnPercentage, pendingAmount }) => (
          <div key={loan.id} className="border rounded-xl p-4 space-y-3 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {loan.source_account_name} → {loan.destination_account_name}
                  </span>
                  {getStatusBadge(loan.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  ID: {loan.unique_identifier} • {format(new Date(loan.transaction_date), 'dd/MM/yyyy')}
                </p>
                <p className="text-sm text-muted-foreground">{loan.description}</p>
              </div>
              <div className="text-right space-y-1">
                <div className="text-lg font-bold text-foreground">
                  {formatCurrency(Number(loan.amount))}
                </div>
                <div className="text-xs text-muted-foreground">Valor original</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso de devolução</span>
                <span className="font-medium text-foreground">{returnPercentage.toFixed(1)}%</span>
              </div>
              <Progress value={returnPercentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Devolvido: {formatCurrency(totalReturned)}</span>
                <span>Pendente: {formatCurrency(pendingAmount)}</span>
              </div>
            </div>

            {returns.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Devoluções realizadas:</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Valor</TableHead>
                      <TableHead className="text-xs">ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returns.map(ret => (
                      <TableRow key={ret.id}>
                        <TableCell className="text-xs">{format(new Date(ret.transaction_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-xs font-medium">{formatCurrency(Number(ret.amount))}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{ret.unique_identifier}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        ))}
      </div>
    </CollapsibleCard>
  );
};
