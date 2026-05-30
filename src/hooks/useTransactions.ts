import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '@/lib/apiClient';
import { Transaction, TransactionType } from '@/types/database';

export interface TransactionWithAccounts extends Transaction {
  source_account_name?: string;
  source_account_number?: string;
  source_account_coordinator_name?: string;
  destination_account_name?: string;
  destination_account_number?: string;
  destination_account_coordinator_name?: string;
}

export interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  transactionType?: TransactionType;
  accountId?: string;
  minAmount?: number;
  maxAmount?: number;
  description?: string;
}

export interface CreateTransactionPayload {
  source_account_id: string;
  destination_account_id: string;
  transaction_date: string;
  amount: number;
  transaction_type: TransactionType;
  description: string;
  parent_transaction_id?: string | null;
}

export interface CreateReturnPayload {
  transaction_date: string;
  amount: number;
  description: string;
}

function invalidateTransactionReports(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['transactions'] });
  queryClient.invalidateQueries({ queryKey: ['transaction-insights'] });
  queryClient.invalidateQueries({ queryKey: ['monthly-volumes'] });
  queryClient.invalidateQueries({ queryKey: ['optimized-account-summaries'] });
  queryClient.invalidateQueries({ queryKey: ['executive-insights-ai'] });
  queryClient.invalidateQueries({ queryKey: ['adm-position'] });
  queryClient.invalidateQueries({ queryKey: ['adm-project-details'] });
  queryClient.invalidateQueries({ queryKey: ['inter-project-loans'] });
}

export const useTransactions = (filters?: TransactionFilters) => {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async (): Promise<TransactionWithAccounts[]> => {
      return transactionsApi.list<TransactionWithAccounts[]>(filters);
    }
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (transaction: CreateTransactionPayload) => {
      return transactionsApi.create<Transaction>(transaction);
    },
    onSuccess: () => {
      invalidateTransactionReports(queryClient);
    }
  });
};

export const useCreateReturn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ loanId, payload }: { loanId: string; payload: CreateReturnPayload }) => {
      return transactionsApi.createReturn<Transaction>(loanId, payload);
    },
    onSuccess: () => {
      invalidateTransactionReports(queryClient);
    },
  });
};
