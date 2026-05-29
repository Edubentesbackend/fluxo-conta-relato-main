import { useMemo } from 'react';
import { Account, Transaction, TransactionWithRunningBalance } from '@/types/database';

export interface CounterpartBreakdown {
  counterpart: Account;
  totalSent: number;
  totalReceived: number;
  sentPercentage: number;
  receivedPercentage: number;
  transactions: TransactionWithRunningBalance[];
  pendingReturns: number;
  netBalance: number;
  position: 'devedora' | 'credora' | 'equilibrada';
  firstTransactionDate: string | null;
  lastTransactionDate: string | null;
  transactionCount: number;
}

export interface AccountBreakdownData {
  account: Account | undefined;
  totalSent: number;
  totalReceived: number;
  netBalance: number;
  position: 'devedora' | 'credora' | 'equilibrada';
  counterpartBreakdowns: CounterpartBreakdown[];
  totalCounterparts: number;
  pendingLoans: number;
}

export const useAccountBreakdown = (
  accountId: string | undefined,
  accounts: Account[],
  transactions: Transaction[]
): AccountBreakdownData => {
  return useMemo(() => {
    if (!accountId) {
      return {
        account: undefined,
        totalSent: 0,
        totalReceived: 0,
        netBalance: 0,
        position: 'equilibrada',
        counterpartBreakdowns: [],
        totalCounterparts: 0,
        pendingLoans: 0,
      };
    }

    const account = accounts.find(acc => acc.id === accountId);
    
    // Calculate totals for the account
    const totalSent = transactions
      .filter(t => t.source_account_id === accountId)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const totalReceived = transactions
      .filter(t => t.destination_account_id === accountId)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const netBalance = totalReceived - totalSent;
    
    let position: 'devedora' | 'credora' | 'equilibrada';
    if (netBalance > 0) position = 'devedora';
    else if (netBalance < 0) position = 'credora';
    else position = 'equilibrada';

    // Calculate breakdown by counterpart
    const counterpartMap = new Map<string, CounterpartBreakdown>();
    
    accounts.forEach(counterpartAccount => {
      if (counterpartAccount.id === accountId) return;
      
      const counterpartTransactions = transactions.filter(t => 
        (t.source_account_id === accountId && t.destination_account_id === counterpartAccount.id) ||
        (t.destination_account_id === accountId && t.source_account_id === counterpartAccount.id)
      );
      
      if (counterpartTransactions.length === 0) return;
      
      // Sort transactions by date
      const sortedTransactions = [...counterpartTransactions].sort((a, b) => 
        new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
      );
      
      // Calculate running balance for each transaction
      let runningBalance = 0;
      const transactionsWithBalance: TransactionWithRunningBalance[] = sortedTransactions.map(t => {
        const isReceived = t.destination_account_id === accountId;
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
        .filter(t => t.source_account_id === accountId)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const received = transactionsWithBalance
        .filter(t => t.destination_account_id === accountId)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      // Calculate pending returns (empréstimos not fully returned)
      const pendingReturns = transactionsWithBalance
        .filter(t => 
          t.source_account_id === accountId && 
          t.transaction_type === 'emprestimo' &&
          (t.status === 'pending_return' || t.status === 'partially_returned')
        )
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const counterpartNetBalance = received - sent;
      let counterpartPosition: 'devedora' | 'credora' | 'equilibrada';
      if (counterpartNetBalance > 0) counterpartPosition = 'devedora';
      else if (counterpartNetBalance < 0) counterpartPosition = 'credora';
      else counterpartPosition = 'equilibrada';
      
      // Get first and last transaction dates
      const firstTransactionDate = sortedTransactions.length > 0 ? sortedTransactions[0].transaction_date : null;
      const lastTransactionDate = sortedTransactions.length > 0 ? sortedTransactions[sortedTransactions.length - 1].transaction_date : null;
      
      counterpartMap.set(counterpartAccount.id, {
        counterpart: counterpartAccount,
        totalSent: sent,
        totalReceived: received,
        sentPercentage: totalSent > 0 ? (sent / totalSent) * 100 : 0,
        receivedPercentage: totalReceived > 0 ? (received / totalReceived) * 100 : 0,
        transactions: transactionsWithBalance,
        pendingReturns,
        netBalance: counterpartNetBalance,
        position: counterpartPosition,
        firstTransactionDate,
        lastTransactionDate,
        transactionCount: transactionsWithBalance.length,
      });
    });

    const counterpartBreakdowns = Array.from(counterpartMap.values());
    
    // Calculate total pending loans for the account
    const pendingLoans = transactions
      .filter(t => 
        t.source_account_id === accountId && 
        t.transaction_type === 'emprestimo' &&
        (t.status === 'pending_return' || t.status === 'partially_returned')
      )
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      account,
      totalSent,
      totalReceived,
      netBalance,
      position,
      counterpartBreakdowns,
      totalCounterparts: counterpartBreakdowns.length,
      pendingLoans,
    };
  }, [accountId, accounts, transactions]);
};
