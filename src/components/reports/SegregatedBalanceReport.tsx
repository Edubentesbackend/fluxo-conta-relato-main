import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Users, ChevronDown, ChevronUp, TrendingUp, TrendingDown } from 'lucide-react';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

interface SegregatedBalanceReportProps {
  transactions: TransactionWithAccounts[];
  accounts: Account[];
}

interface CounterpartBalance {
  account: Account;
  counterpart: Account;
  totalSent: number;
  totalReceived: number;
  netBalance: number;
  position: 'debtor' | 'creditor' | 'balanced';
  transactions: TransactionWithAccounts[];
}

interface AccountSegregatedData {
  account: Account;
  balances: CounterpartBalance[];
  totalOwed: number; // Total que a conta deve para outros
  totalOwing: number; // Total que outros devem para a conta
}

export const SegregatedBalanceReport: React.FC<SegregatedBalanceReportProps> = ({
  transactions,
  accounts,
}) => {
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);

  const segregatedData = useMemo((): AccountSegregatedData[] => {
    return accounts.map(account => {
      const balances: CounterpartBalance[] = [];
      let totalOwed = 0;
      let totalOwing = 0;

      accounts.forEach(counterpart => {
        if (counterpart.id === account.id) return;

        const accountTransactions = transactions.filter(
          t =>
            (t.source_account_id === account.id && t.destination_account_id === counterpart.id) ||
            (t.destination_account_id === account.id && t.source_account_id === counterpart.id)
        );

        if (accountTransactions.length === 0) return;

        const totalSent = accountTransactions
          .filter(t => t.source_account_id === account.id)
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const totalReceived = accountTransactions
          .filter(t => t.destination_account_id === account.id)
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const netBalance = totalReceived - totalSent;

        let position: 'debtor' | 'creditor' | 'balanced';
        if (netBalance > 0) {
          position = 'debtor'; // Recebeu mais = deve devolver
          totalOwed += Math.abs(netBalance);
        } else if (netBalance < 0) {
          position = 'creditor'; // Enviou mais = tem a receber
          totalOwing += Math.abs(netBalance);
        } else {
          position = 'balanced';
        }

        balances.push({
          account,
          counterpart,
          totalSent,
          totalReceived,
          netBalance,
          position,
          transactions: accountTransactions,
        });
      });

      return {
        account,
        balances: balances.sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance)),
        totalOwed,
        totalOwing,
      };
    }).filter(data => data.balances.length > 0);
  }, [accounts, transactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getPositionBadge = (position: 'debtor' | 'creditor' | 'balanced') => {
    const variants = {
      creditor: {
        className: 'bg-success/10 text-success border-success/20',
        icon: <TrendingUp className="w-3 h-3" />,
        label: 'A Receber',
      },
      debtor: {
        className: 'bg-destructive/10 text-destructive border-destructive/20',
        icon: <TrendingDown className="w-3 h-3" />,
        label: 'A Pagar',
      },
      balanced: {
        className: 'bg-muted text-muted-foreground border-border',
        icon: null,
        label: 'Equilibrado',
      },
    };

    const variant = variants[position];
    return (
      <Badge className={cn('text-xs font-medium px-2 py-1 flex items-center gap-1', variant.className)}>
        {variant.icon}
        {variant.label}
      </Badge>
    );
  };

  if (segregatedData.length === 0) {
    return (
      <CollapsibleCard
        title="Relatório Segregado por Contraparte"
        icon={<Users className="h-5 w-5 text-primary" />}
        defaultOpen={false}
      >
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma transação encontrada entre contas
        </div>
      </CollapsibleCard>
    );
  }

  return (
    <CollapsibleCard
      title="Relatório Segregado por Contraparte"
      icon={<Users className="h-5 w-5 text-primary" />}
      badge={
        <Badge variant="secondary" className="ml-2">
          {segregatedData.length} contas analisadas
        </Badge>
      }
      defaultOpen={true}
    >
      <div className="space-y-4">
        {segregatedData.map(({ account, balances, totalOwed, totalOwing }) => (
          <div key={account.id} className="border rounded-xl overflow-hidden">
            <div
              className="p-4 bg-gradient-to-r from-primary/5 to-accent/5 cursor-pointer hover:from-primary/10 hover:to-accent/10 transition-all"
              onClick={() => setExpandedAccount(expandedAccount === account.id ? null : account.id)}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg text-foreground">{account.name}</h3>
                    <span className="text-xs text-muted-foreground">({account.account_number})</span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    {totalOwed > 0 && (
                      <span className="text-destructive font-medium">
                        Deve: {formatCurrency(totalOwed)}
                      </span>
                    )}
                    {totalOwing > 0 && (
                      <span className="text-success font-medium">
                        A Receber: {formatCurrency(totalOwing)}
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  {expandedAccount === account.id ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {expandedAccount === account.id && (
              <div className="p-4 bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contraparte</TableHead>
                      <TableHead className="text-right">Enviado</TableHead>
                      <TableHead className="text-right">Recebido</TableHead>
                      <TableHead className="text-right">Saldo Líquido</TableHead>
                      <TableHead>Posição</TableHead>
                      <TableHead className="text-center">Transações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {balances.map(balance => (
                      <TableRow key={balance.counterpart.id}>
                        <TableCell className="font-medium">
                          <div className="space-y-1">
                            <div>{balance.counterpart.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {balance.counterpart.account_number}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-warning">
                          {formatCurrency(balance.totalSent)}
                        </TableCell>
                        <TableCell className="text-right text-success">
                          {formatCurrency(balance.totalReceived)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          <span
                            className={cn(
                              balance.netBalance > 0 && 'text-destructive',
                              balance.netBalance < 0 && 'text-success'
                            )}
                          >
                            {formatCurrency(Math.abs(balance.netBalance))}
                          </span>
                        </TableCell>
                        <TableCell>{getPositionBadge(balance.position)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{balance.transactions.length}</Badge>
                        </TableCell>
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
