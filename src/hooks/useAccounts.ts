import { useQuery } from '@tanstack/react-query';
import { accountsApi } from '@/lib/apiClient';
import { Account } from '@/types/database';

export const useAccounts = () => {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async (): Promise<Account[]> => {
      return accountsApi.list<Account[]>();
    }
  });
};
