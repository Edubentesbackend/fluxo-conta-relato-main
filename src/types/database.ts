export type AccountType = 'projeto' | 'adm' | 'transitoria';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  projeto: 'Projeto',
  adm: 'ADM',
  transitoria: 'Transitória',
};

export interface Account {
  id: string;
  name: string;
  description?: string;
  account_number?: string;
  account_type: AccountType;
  coordinator_id?: string | null;
  coordinator_name?: string | null;
  coordinator?: ProjectCoordinator | null;
  archived_at?: string | null;
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
  voided_at?: string | null;
  voided_by_id?: string | null;
  void_reason?: string | null;
}

export type TransactionAuditAction = 'updated' | 'voided';

export interface TransactionAuditEvent {
  id: string;
  transaction_id: string;
  action: TransactionAuditAction;
  before: Record<string, unknown>;
  after?: Record<string, unknown> | null;
  reason: string;
  created_by_id?: string | null;
  created_at: string;
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
  total_entries: number;
  total_exits: number;
  net_balance: number;
  position: 'devedora' | 'credora' | 'equilibrada';
  total_transactions: number;
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

export interface TransactionWithAccounts extends Transaction {
  source_account_name?: string;
  source_account_number?: string;
  source_account_type?: AccountType | null;
  source_account_coordinator_name?: string;
  destination_account_name?: string;
  destination_account_number?: string;
  destination_account_type?: AccountType | null;
  destination_account_coordinator_name?: string;
}

export type FlowScope = 'all' | 'adm' | 'between_projects';
export type LoanVisibility = 'open' | 'settled' | 'all';
export type LoanSettlementDirection = 'adm_owes_projects' | 'projects_owe_adm' | 'between_projects';
export type LoanSettlementReviewStatus = 'reviewed' | 'needs_correction' | 'corrected' | 'disputed';

export interface LoanReportFilters {
  asOf?: Date | string;
  projectId?: string;
  loanStatus?: LoanVisibility;
}

export interface LoanSettlementFilters {
  settledStartDate?: Date | string;
  settledEndDate?: Date | string;
  projectId?: string;
  direction?: LoanSettlementDirection;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  onlyWithCorrections?: boolean;
}

export interface LoanProjectDebt {
  account: Account;
  borrowed: number;
  returned: number;
  pending: number;
  return_percentage: number;
  oldest_date: string;
  open_loans_count: number;
  loan_count: number;
}

export interface AdmLoanDetail {
  direction: 'adm_owes_projects' | 'projects_owe_adm';
  project: Account;
  loan: TransactionWithAccounts;
  returns: TransactionWithAccounts[];
  borrowed: number;
  returned: number;
  pending: number;
  days_outstanding: number;
  return_percentage: number;
}

export interface AdmPositionReport {
  adm_account: Account;
  as_of: string;
  loan_status: LoanVisibility;
  net_position: number;
  adm_owes_projects: {
    total: number;
    count: number;
    oldest_loan_date: string | null;
    by_project: LoanProjectDebt[];
  };
  projects_owe_adm: {
    total: number;
    count: number;
    oldest_loan_date: string | null;
    by_project: LoanProjectDebt[];
  };
}

export interface AdmProjectDetailsReport {
  adm_account: Account;
  project: Account;
  as_of: string;
  loan_status: LoanVisibility;
  adm_owes_projects: AdmLoanDetail[];
  projects_owe_adm: AdmLoanDetail[];
}

export interface AdmPositionExportReport {
  as_of: string;
  consolidated: Array<Record<string, string | number | null | undefined>>;
  movements: Array<Record<string, string | number | null | undefined>>;
}

export interface LoanSettlementReview {
  id: string;
  loan_id: string;
  review_status: LoanSettlementReviewStatus;
  reason: string;
  notes?: string | null;
  created_by_id?: string | null;
  created_by_name?: string | null;
  created_by_email?: string | null;
  created_at: string;
}

export interface LoanSettlementItem {
  direction: LoanSettlementDirection;
  project: Account | null;
  creditor: Account;
  debtor: Account;
  loan: TransactionWithAccounts;
  movements: TransactionWithAccounts[];
  reviews: LoanSettlementReview[];
  latest_review: LoanSettlementReview | null;
  borrowed: number;
  returned: number;
  pending: number;
  settled_at: string;
  days_to_settlement: number | null;
  return_percentage: number;
  has_corrections: boolean;
  needs_attention: boolean;
}

export interface LoanSettlementsReport {
  generated_at: string;
  filters: LoanSettlementFilters;
  summary: {
    settled_count: number;
    reviewed_count: number;
    needs_correction_count: number;
    corrected_count: number;
    disputed_count: number;
    with_corrections_count: number;
    total_borrowed: number;
    total_returned: number;
  };
  settlements: LoanSettlementItem[];
}

export interface InterProjectLoanDetail {
  loan: TransactionWithAccounts;
  returns: TransactionWithAccounts[];
  borrowed: number;
  returned: number;
  pending: number;
}

export interface InterProjectLoanPair {
  creditor: Account;
  debtor: Account;
  borrowed: number;
  returned: number;
  pending: number;
  days_outstanding: number;
  return_percentage: number;
  oldest_date: string;
  transactions: InterProjectLoanDetail[];
}

export interface InterProjectLoansReport {
  total_circulating: number;
  active_pairs_count: number;
  oldest_loan_date: string | null;
  by_pair: InterProjectLoanPair[];
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  transactionType?: TransactionType;
  accountId?: string;
  minAmount?: number;
  maxAmount?: number;
  description?: string;
  flow_scope?: FlowScope;
}
