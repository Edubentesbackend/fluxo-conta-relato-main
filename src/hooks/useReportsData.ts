import { useQuery } from '@tanstack/react-query';
import { aiApi, reportsApi } from '@/lib/apiClient';
import { TransactionType } from '@/types/database';
import { TransactionFilters } from './useTransactions';

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

const emptyInsights: TransactionInsights = {
  total_volume: 0,
  transaction_count: 0,
  avg_transaction_amount: 0,
  most_active_account_name: 'Nenhuma',
  most_active_account_transactions: 0,
  highest_value_transaction_amount: 0,
  most_common_transaction_type: 'emprestimo'
};

export const useTransactionInsights = (filters?: TransactionFilters) => {
  return useQuery({
    queryKey: ['transaction-insights', filters],
    queryFn: async (): Promise<TransactionInsights> => {
      return reportsApi.insights<TransactionInsights>(filters);
    },
    placeholderData: emptyInsights,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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
      return reportsApi.monthlyVolumes<MonthlyVolume[]>(filters, monthsBack);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useOptimizedAccountSummaries = (filters?: TransactionFilters) => {
  return useQuery({
    queryKey: ['optimized-account-summaries', filters],
    queryFn: async () => {
      return reportsApi.accountSummaries(filters);
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useExecutiveInsights = (filters?: TransactionFilters, enabled = true) => {
  return useQuery({
    queryKey: ['executive-insights-ai', filters],
    queryFn: async (): Promise<{ insights: string; model: string }> => {
      return aiApi.executiveInsights(filters);
    },
    enabled,
    retry: false,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });
};
