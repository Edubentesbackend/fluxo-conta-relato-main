import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Account } from '@/types/database';

export const useAccounts = () => {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async (): Promise<Account[]> => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });
};