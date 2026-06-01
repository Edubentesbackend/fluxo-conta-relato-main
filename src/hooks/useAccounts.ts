import { useQuery } from '@tanstack/react-query';
import { accountsApi } from '@/lib/apiClient';
import { Account } from '@/types/database';

export const useAccounts = (includeArchived = false) => {
  return useQuery({
    queryKey: ['accounts', { includeArchived }],
    queryFn: async (): Promise<Account[]> => {
      return accountsApi.list<Account[]>(includeArchived);
    }
  });
};
