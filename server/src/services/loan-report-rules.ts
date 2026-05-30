import { badRequest } from "../utils/errors.js";
import { getLoanStatus } from "./transaction-rules.js";

export type LoanVisibility = "open" | "settled" | "all";

export interface HistoricalReturn {
  amount: number;
  transactionDate: Date;
}

export function resolveLoanCutoff(asOf?: string) {
  if (!asOf) return new Date();

  const cutoff = new Date(asOf);
  if (Number.isNaN(cutoff.getTime())) {
    throw badRequest("Data de corte invalida");
  }

  return cutoff;
}

export function calculateHistoricalLoanSnapshot(
  loanAmount: number,
  loanDate: Date,
  returns: HistoricalReturn[],
  cutoff: Date,
) {
  const returned = returns
    .filter((item) => item.transactionDate <= cutoff)
    .reduce((sum, item) => sum + item.amount, 0);
  const pending = Math.max(loanAmount - returned, 0);

  return {
    borrowed: loanAmount,
    returned,
    pending,
    status: getLoanStatus(loanAmount, returned),
    daysOutstanding: Math.max(
      0,
      Math.floor((cutoff.getTime() - loanDate.getTime()) / 86_400_000),
    ),
    returnPercentage: loanAmount > 0 ? (returned / loanAmount) * 100 : 0,
  };
}

export function matchesLoanVisibility(pending: number, visibility: LoanVisibility = "open") {
  if (visibility === "all") return true;
  return visibility === "open" ? pending > 0 : pending <= 0;
}
