export interface Account {
  id: string;
  name: string;
  description?: string;
  account_number?: string;
  coordinator_id?: string | null;
  coordinator_name?: string | null;
  coordinator?: ProjectCoordinator | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectCoordinator {
  id: string;
  name: string;
  normalized_name?: string;
}

export type TransactionStatus = 
  | 'pending_return'
  | 'partially_returned'
  | 'fully_returned'
  | 'completed';

export interface Transaction {
  id: string;
  unique_identifier: string;
  source_account_id: string;
  destination_account_id: string;
  transaction_date: string;
  amount: number;
  transaction_type: TransactionType;
  description: string;
  created_at: string;
  updated_at: string;
  parent_transaction_id?: string | null;
  status: TransactionStatus;
}

export type TransactionType = 
  | 'emprestimo'
  | 'devolucao'
  | 'ajuste'
  | 'rateio'
  | 'correcao'
  | 'estorno'
  | 'transferencia_operacional';

export const TRANSACTION_TYPES: { value: TransactionType; label: string }[] = [
  { value: 'emprestimo', label: 'Empréstimo' },
  { value: 'devolucao', label: 'Devolução' },
  { value: 'ajuste', label: 'Ajuste' },
  { value: 'rateio', label: 'Rateio' },
  { value: 'correcao', label: 'Correção' },
  { value: 'estorno', label: 'Estorno' },
  { value: 'transferencia_operacional', label: 'Transferência Operacional' }
];

export interface AccountSummary {
  account: Account;
  totalEntries: number;
  totalExits: number;
  netBalance: number;
  position: 'devedora' | 'credora' | 'equilibrada';
}

export interface CounterpartSummary {
  counterpart: Account;
  totalSent: number;
  totalReceived: number;
  netBalance: number;
  position: 'devedora' | 'credora' | 'equilibrada';
  transactions: Transaction[];
}

export interface TransactionWithRunningBalance extends Transaction {
  runningBalance: number;
  balanceChange: 'increase' | 'decrease';
}
