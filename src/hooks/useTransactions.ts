import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, TransactionType } from '@/types/database';

export interface TransactionWithAccounts extends Transaction {
  source_account_name?: string;
  destination_account_name?: string;
}

export const useTransactions = (filters?: {
  startDate?: Date;
  endDate?: Date;
  transactionType?: TransactionType;
  accountId?: string;
  minAmount?: number;
  maxAmount?: number;
  description?: string;
}) => {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async (): Promise<TransactionWithAccounts[]> => {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          source_account:accounts!source_account_id(name),
          destination_account:accounts!destination_account_id(name)
        `)
        .order('transaction_date', { ascending: false });
      
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
      
      if (filters?.minAmount) {
        query = query.gte('amount', filters.minAmount);
      }
      
      if (filters?.maxAmount) {
        query = query.lte('amount', filters.maxAmount);
      }
      
      if (filters?.description) {
        query = query.ilike('description', `%${filters.description}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Transform the data to include account names
      const transformedData = (data || []).map(transaction => ({
        ...transaction,
        source_account_name: transaction.source_account?.name,
        destination_account_name: transaction.destination_account?.name
      }));
      
      return transformedData;
    }
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert([transaction])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });
};