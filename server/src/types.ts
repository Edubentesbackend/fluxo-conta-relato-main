import type { TransactionType, UserRole } from "@prisma/client";

export type { UserRole };

export interface AuthUser {
  sub: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  transactionType?: TransactionType;
  accountId?: string;
  minAmount?: number;
  maxAmount?: number;
  description?: string;
  flow_scope?: "all" | "adm" | "between_projects";
}

export interface AccountFilters {
  search?: string;
}
