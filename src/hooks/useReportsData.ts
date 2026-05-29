import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TransactionType } from '@/types/database';

export interface TransactionInsights {
  total_volume: number;
  transaction_count: number;
  avg_transaction_amount: number;
  most_active_account_name: string;
  most_active_account_transactions: number;
  highest_value_transaction_amount: number;
  most_common_transaction_type: string;
}

export interface MonthlyVolume {
  month_year: string;
  total_volume: number;
  transaction_count: number;
}

export const useTransactionInsights = (filters?: {
  startDate?: Date;
  endDate?: Date;
  transactionType?: TransactionType;
  accountId?: string;
  minAmount?: number;
  maxAmount?: number;
  description?: string;
}) => {
  return useQuery({
    queryKey: ['transaction-insights', filters],
    queryFn: async (): Promise<TransactionInsights> => {
      const { data, error } = await supabase.rpc('get_transaction_insights', {
        start_date: filters?.startDate?.toISOString(),
        end_date: filters?.endDate?.toISOString()
      });
      
      if (error) throw error;
      return data?.[0] || {
        total_volume: 0,
        transaction_count: 0,
        avg_transaction_amount: 0,
        most_active_account_name: 'Nenhuma',
        most_active_account_transactions: 0,
        highest_value_transaction_amount: 0,
        most_common_transaction_type: 'emprestimo'
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useMonthlyVolumes = (filters?: {
  startDate?: Date;
  endDate?: Date;
  transactionType?: TransactionType;
  accountId?: string;
}, monthsBack: number = 18) => {
  return useQuery({
    queryKey: ['monthly-volumes', filters, monthsBack],
    queryFn: async (): Promise<MonthlyVolume[]> => {
      // Se não houver função RPC, vamos buscar diretamente das transações
      let query = supabase
        .from('transactions')
        .select('transaction_date, amount');

      // Aplicar filtros se existirem
      if (filters?.startDate) {
        query = query.gte('transaction_date', filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte('transaction_date', filters.endDate.toISOString());
      }
      if (filters?.transactionType) {
        query = query.eq('transaction_type', filters.transactionType);
      }
      if (filters?.accountId) {
        query = query.or(`source_account_id.eq.${filters.accountId},destination_account_id.eq.${filters.accountId}`);
      }

      const { data: transactions, error } = await query;
      
      if (error) throw error;

      // Agrupar por mês/ano
      const monthlyData: Record<string, { total_volume: number; transaction_count: number }> = {};
      
      transactions?.forEach(transaction => {
        const ts = String((transaction as any).transaction_date);
        const monthYear = ts.slice(0, 7); // YYYY-MM
        
        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = { total_volume: 0, transaction_count: 0 };
        }
        
        monthlyData[monthYear].total_volume += Math.abs(parseFloat((transaction as any).amount.toString()));
        monthlyData[monthYear].transaction_count += 1;
      });

      // Converter para array e ordenar
      const result: MonthlyVolume[] = Object.entries(monthlyData)
        .map(([monthYear, data]) => ({
          month_year: monthYear,
          total_volume: data.total_volume,
          transaction_count: data.transaction_count
        }))
        .sort((a, b) => a.month_year.localeCompare(b.month_year));

      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes para dados mais frescos
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useOptimizedAccountSummaries = (filters?: {
  startDate?: Date;
  endDate?: Date;
  transactionType?: TransactionType;
  accountId?: string;
  minAmount?: number;
  maxAmount?: number;
  description?: string;
}) => {
  return useQuery({
    queryKey: ['optimized-account-summaries', filters],
    queryFn: async () => {
      // Use regular transactions for now since materialized view is secured
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .order('name');
      
      if (accountsError) throw accountsError;
      
      let transactionQuery = supabase
        .from('transactions')
        .select('*');
      
      // Apply filters to transaction query
      if (filters?.startDate) {
        transactionQuery = transactionQuery.gte('transaction_date', filters.startDate.toISOString());
      }
      
      if (filters?.endDate) {
        transactionQuery = transactionQuery.lte('transaction_date', filters.endDate.toISOString());
      }
      
      if (filters?.transactionType) {
        transactionQuery = transactionQuery.eq('transaction_type', filters.transactionType);
      }
      
      if (filters?.minAmount) {
        transactionQuery = transactionQuery.gte('amount', filters.minAmount);
      }
      
      if (filters?.maxAmount) {
        transactionQuery = transactionQuery.lte('amount', filters.maxAmount);
      }
      
      if (filters?.description) {
        transactionQuery = transactionQuery.ilike('description', `%${filters.description}%`);
      }
      
      const { data: transactions, error: transactionsError } = await transactionQuery;
      
      if (transactionsError) throw transactionsError;
      
      // Calculate summaries in frontend for now (can be optimized later)
      const summaries = accounts.map(account => {
        const entries = transactions
          .filter(t => t.destination_account_id === account.id)
          .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
        
        const exits = transactions
          .filter(t => t.source_account_id === account.id)
          .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
        
        const netBalance = entries - exits;
        const totalTransactions = transactions.filter(t => 
          t.source_account_id === account.id || t.destination_account_id === account.id
        ).length;
        
        let position: 'devedora' | 'credora' | 'equilibrada';
        if (netBalance > 0) position = 'devedora';
        else if (netBalance < 0) position = 'credora';
        else position = 'equilibrada';
        
        return {
          account,
          total_entries: entries,
          total_exits: exits,
          net_balance: netBalance,
          position,
          total_transactions: totalTransactions
        };
      });
      
      return summaries;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};