import type { Prisma } from "@prisma/client";
import { ADM_ACCOUNT_NUMBER } from "../constants/index.js";
import { prisma } from "../lib/prisma.js";
import { badRequest, notFound } from "../utils/errors.js";
import { positionFromBalance, serializeAccount, serializeTransaction } from "../utils/serialize.js";
import { buildTransactionWhere, type TransactionFilters } from "./transaction-service.js";
import {
  calculateHistoricalLoanSnapshot,
  matchesLoanVisibility,
  resolveLoanCutoff,
  type LoanVisibility,
} from "./loan-report-rules.js";

export async function getTransactionInsights(filters: TransactionFilters = {}) {
  const transactions = await prisma.transaction.findMany({
    where: buildTransactionWhere(filters),
    include: {
      sourceAccount: { include: { coordinator: true } },
      destinationAccount: { include: { coordinator: true } },
    },
  });

  const totalVolume = transactions.reduce((sum, item) => sum + Math.abs(Number(item.amount)), 0);
  const transactionCount = transactions.length;
  const avgTransactionAmount = transactionCount > 0 ? totalVolume / transactionCount : 0;
  const highestValueTransactionAmount = transactions.reduce(
    (max, item) => Math.max(max, Number(item.amount)),
    0,
  );

  const accountActivity = new Map<string, { name: string; count: number }>();
  const typeActivity = new Map<string, number>();

  for (const transaction of transactions) {
    for (const account of [transaction.sourceAccount, transaction.destinationAccount]) {
      const current = accountActivity.get(account.id) || { name: account.name, count: 0 };
      current.count += 1;
      accountActivity.set(account.id, current);
    }

    typeActivity.set(
      transaction.transactionType,
      (typeActivity.get(transaction.transactionType) || 0) + 1,
    );
  }

  const mostActiveAccount = [...accountActivity.values()].sort((a, b) => b.count - a.count)[0];
  const mostCommonTransactionType =
    [...typeActivity.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "emprestimo";

  return {
    total_volume: totalVolume,
    transaction_count: transactionCount,
    avg_transaction_amount: avgTransactionAmount,
    most_active_account_name: mostActiveAccount?.name || "Nenhuma",
    most_active_account_transactions: mostActiveAccount?.count || 0,
    highest_value_transaction_amount: highestValueTransactionAmount,
    most_common_transaction_type: mostCommonTransactionType,
  };
}

export async function getMonthlyVolumes(filters: TransactionFilters = {}, monthsBack = 12) {
  const fallbackStart = new Date();
  fallbackStart.setMonth(fallbackStart.getMonth() - monthsBack + 1);
  fallbackStart.setDate(1);
  fallbackStart.setHours(0, 0, 0, 0);

  const where = buildTransactionWhere({
    ...filters,
    startDate: filters.startDate || fallbackStart.toISOString(),
  });

  const transactions = await prisma.transaction.findMany({ where });
  const monthly = new Map<string, { total_volume: number; transaction_count: number }>();

  for (const transaction of transactions) {
    const key = transaction.transactionDate.toISOString().slice(0, 7);
    const current = monthly.get(key) || { total_volume: 0, transaction_count: 0 };
    current.total_volume += Math.abs(Number(transaction.amount));
    current.transaction_count += 1;
    monthly.set(key, current);
  }

  return [...monthly.entries()]
    .map(([month_year, values]) => ({ month_year, ...values }))
    .sort((a, b) => a.month_year.localeCompare(b.month_year));
}

export async function getAccountSummaries(filters: TransactionFilters = {}) {
  const [accounts, transactions] = await Promise.all([
    prisma.account.findMany({ include: { coordinator: true }, orderBy: { name: "asc" } }),
    prisma.transaction.findMany({ where: buildTransactionWhere(filters) }),
  ]);

  return accounts.map((account) => {
    const entries = transactions
      .filter((transaction) => transaction.destinationAccountId === account.id)
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const exits = transactions
      .filter((transaction) => transaction.sourceAccountId === account.id)
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const netBalance = entries - exits;
    const totalTransactions = transactions.filter(
      (transaction) =>
        transaction.sourceAccountId === account.id ||
        transaction.destinationAccountId === account.id,
    ).length;

    return {
      account: serializeAccount(account),
      total_entries: entries,
      total_exits: exits,
      net_balance: netBalance,
      position: positionFromBalance(netBalance),
      total_transactions: totalTransactions,
    };
  });
}

export async function getAccountBreakdown(accountId: string, filters: TransactionFilters = {}) {
  const [account, accounts, transactions] = await Promise.all([
    prisma.account.findUnique({ where: { id: accountId }, include: { coordinator: true } }),
    prisma.account.findMany({ include: { coordinator: true }, orderBy: { name: "asc" } }),
    prisma.transaction.findMany({
      where: buildTransactionWhere({ ...filters, accountId }),
      include: {
        sourceAccount: { include: { coordinator: true } },
        destinationAccount: { include: { coordinator: true } },
      },
      orderBy: { transactionDate: "asc" },
    }),
  ]);

  const totalSent = transactions
    .filter((transaction) => transaction.sourceAccountId === accountId)
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const totalReceived = transactions
    .filter((transaction) => transaction.destinationAccountId === accountId)
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const counterpartBreakdowns = accounts
    .filter((counterpart) => counterpart.id !== accountId)
    .map((counterpart) => {
      const related = transactions.filter(
        (transaction) =>
          (transaction.sourceAccountId === accountId && transaction.destinationAccountId === counterpart.id) ||
          (transaction.destinationAccountId === accountId && transaction.sourceAccountId === counterpart.id),
      );
      if (related.length === 0) return null;

      let runningBalance = 0;
      const transactionsWithBalance = related.map((transaction) => {
        const isReceived = transaction.destinationAccountId === accountId;
        runningBalance += isReceived ? Number(transaction.amount) : -Number(transaction.amount);
        return {
          ...serializeTransaction(transaction),
          runningBalance,
          balanceChange: isReceived ? "increase" : "decrease",
        };
      });

      const sent = related
        .filter((transaction) => transaction.sourceAccountId === accountId)
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
      const received = related
        .filter((transaction) => transaction.destinationAccountId === accountId)
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
      const netBalance = received - sent;

      return {
        counterpart: serializeAccount(counterpart),
        totalSent: sent,
        totalReceived: received,
        sentPercentage: totalSent > 0 ? (sent / totalSent) * 100 : 0,
        receivedPercentage: totalReceived > 0 ? (received / totalReceived) * 100 : 0,
        transactions: transactionsWithBalance,
        pendingReturns: related
          .filter(
            (transaction) =>
              transaction.sourceAccountId === accountId &&
              transaction.transactionType === "emprestimo" &&
              ["pending_return", "partially_returned"].includes(transaction.status),
          )
          .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
        netBalance,
        position: positionFromBalance(netBalance),
        firstTransactionDate: related[0]?.transactionDate.toISOString() || null,
        lastTransactionDate: related[related.length - 1]?.transactionDate.toISOString() || null,
        transactionCount: related.length,
      };
    })
    .filter(Boolean);

  const netBalance = totalReceived - totalSent;

  return {
    account: account ? serializeAccount(account) : undefined,
    totalSent,
    totalReceived,
    netBalance,
    position: positionFromBalance(netBalance),
    counterpartBreakdowns,
    totalCounterparts: counterpartBreakdowns.length,
    pendingLoans: transactions
      .filter(
        (transaction) =>
          transaction.sourceAccountId === accountId &&
          transaction.transactionType === "emprestimo" &&
          ["pending_return", "partially_returned"].includes(transaction.status),
      )
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
  };
}

function oldestDate(projects: Array<{ oldest_date: string }>): string | null {
  return projects.reduce<string | null>((acc, p) => {
    if (!acc) return p.oldest_date;
    return p.oldest_date < acc ? p.oldest_date : acc;
  }, null);
}

export interface LoanReportFilters {
  asOf?: string;
  projectId?: string;
  loanStatus?: LoanVisibility;
}

const LOAN_ACCOUNT_INCLUDE = { include: { coordinator: true } } as const;

type LoanWithRelations = Prisma.TransactionGetPayload<{
  include: {
    sourceAccount: typeof LOAN_ACCOUNT_INCLUDE;
    destinationAccount: typeof LOAN_ACCOUNT_INCLUDE;
    returns: {
      include: {
        sourceAccount: typeof LOAN_ACCOUNT_INCLUDE;
        destinationAccount: typeof LOAN_ACCOUNT_INCLUDE;
      };
    };
  };
}>;

function getLoanInclude(cutoff: Date) {
  return {
    sourceAccount: LOAN_ACCOUNT_INCLUDE,
    destinationAccount: LOAN_ACCOUNT_INCLUDE,
    returns: {
      where: {
        transactionType: "devolucao" as const,
        transactionDate: { lte: cutoff },
      },
      include: {
        sourceAccount: LOAN_ACCOUNT_INCLUDE,
        destinationAccount: LOAN_ACCOUNT_INCLUDE,
      },
      orderBy: { transactionDate: "asc" as const },
    },
  };
}

function buildLoanSnapshot(loan: LoanWithRelations, cutoff: Date) {
  const snapshot = calculateHistoricalLoanSnapshot(
    Number(loan.amount),
    loan.transactionDate,
    loan.returns.map((item) => ({
      amount: Number(item.amount),
      transactionDate: item.transactionDate,
    })),
    cutoff,
  );

  return {
    loan: {
      ...serializeTransaction(loan),
      status: snapshot.status,
    },
    returns: loan.returns.map(serializeTransaction),
    borrowed: snapshot.borrowed,
    returned: snapshot.returned,
    pending: snapshot.pending,
    days_outstanding: snapshot.daysOutstanding,
    return_percentage: snapshot.returnPercentage,
  };
}

function buildAdmLoanDetail(loan: LoanWithRelations, admAccountId: string, cutoff: Date) {
  const projectIsSource = loan.sourceAccountId !== admAccountId;
  return {
    direction: projectIsSource ? "adm_owes_projects" as const : "projects_owe_adm" as const,
    project: serializeAccount(projectIsSource ? loan.sourceAccount : loan.destinationAccount),
    ...buildLoanSnapshot(loan, cutoff),
  };
}

type AdmLoanDetail = ReturnType<typeof buildAdmLoanDetail>;

function buildDebtGroup(loans: AdmLoanDetail[], visibility: LoanVisibility) {
  const byProject = new Map<string, {
    account: ReturnType<typeof serializeAccount>;
    borrowed: number;
    returned: number;
    pending: number;
    oldest_date: string;
    open_loans_count: number;
    loan_count: number;
  }>();

  for (const loan of loans) {
    if (!matchesLoanVisibility(loan.pending, visibility)) continue;

    const dateStr = loan.loan.transaction_date;

    const existing = byProject.get(loan.project.id);
    if (existing) {
      existing.borrowed += loan.borrowed;
      existing.returned += loan.returned;
      existing.pending += loan.pending;
      existing.open_loans_count += loan.pending > 0 ? 1 : 0;
      existing.loan_count += 1;
      if (dateStr < existing.oldest_date) existing.oldest_date = dateStr;
    } else {
      byProject.set(loan.project.id, {
        account: loan.project,
        borrowed: loan.borrowed,
        returned: loan.returned,
        pending: loan.pending,
        oldest_date: dateStr,
        open_loans_count: loan.pending > 0 ? 1 : 0,
        loan_count: 1,
      });
    }
  }

  return [...byProject.values()]
    .map((p) => {
      const return_percentage = p.borrowed > 0 ? (p.returned / p.borrowed) * 100 : 0;
      return { ...p, return_percentage };
    })
    .sort((a, b) => b.pending - a.pending || b.borrowed - a.borrowed);
}

async function getRequiredAdmAccount() {
  const admAccount = await prisma.account.findUnique({
    where: { accountNumber: ADM_ACCOUNT_NUMBER },
    include: { coordinator: true },
  });

  if (!admAccount) throw notFound(`Conta ADM ${ADM_ACCOUNT_NUMBER} nao cadastrada`);
  if (admAccount.accountType !== "adm") {
    throw badRequest(`A conta ${ADM_ACCOUNT_NUMBER} precisa estar classificada como ADM`);
  }

  return admAccount;
}

async function loadAdmLoans(filters: LoanReportFilters = {}) {
  const admAccount = await getRequiredAdmAccount();
  const cutoff = resolveLoanCutoff(filters.asOf);
  const loans = await prisma.transaction.findMany({
    where: {
      transactionType: "emprestimo",
      transactionDate: { lte: cutoff },
      OR: [
        {
          sourceAccount: { accountType: "projeto" },
          destinationAccountId: admAccount.id,
          ...(filters.projectId ? { sourceAccountId: filters.projectId } : {}),
        },
        {
          sourceAccountId: admAccount.id,
          destinationAccount: { accountType: "projeto" },
          ...(filters.projectId ? { destinationAccountId: filters.projectId } : {}),
        },
      ],
    },
    include: getLoanInclude(cutoff),
    orderBy: { transactionDate: "asc" },
  });

  return {
    admAccount,
    cutoff,
    visibility: filters.loanStatus ?? "open",
    loans: loans.map((loan) => buildAdmLoanDetail(loan, admAccount.id, cutoff)),
  };
}

function buildAdmPosition(data: Awaited<ReturnType<typeof loadAdmLoans>>) {
  const admOwesProjects = buildDebtGroup(
    data.loans.filter((loan) => loan.direction === "adm_owes_projects"),
    data.visibility,
  );
  const projectsOweAdm = buildDebtGroup(
    data.loans.filter((loan) => loan.direction === "projects_owe_adm"),
    data.visibility,
  );

  const admOwesTotal = admOwesProjects.reduce((sum, project) => sum + project.pending, 0);
  const projectsOweTotal = projectsOweAdm.reduce((sum, project) => sum + project.pending, 0);

  return {
    adm_account: serializeAccount(data.admAccount),
    as_of: data.cutoff.toISOString(),
    loan_status: data.visibility,
    net_position: admOwesTotal - projectsOweTotal,
    adm_owes_projects: {
      total: admOwesTotal,
      count: admOwesProjects.length,
      oldest_loan_date: oldestDate(admOwesProjects),
      by_project: admOwesProjects,
    },
    projects_owe_adm: {
      total: projectsOweTotal,
      count: projectsOweAdm.length,
      oldest_loan_date: oldestDate(projectsOweAdm),
      by_project: projectsOweAdm,
    },
  };
}

export async function getAdmPosition(filters: LoanReportFilters = {}) {
  return buildAdmPosition(await loadAdmLoans(filters));
}

export async function getAdmProjectDetails(projectId: string, filters: LoanReportFilters = {}) {
  const project = await prisma.account.findUnique({
    where: { id: projectId },
    include: { coordinator: true },
  });
  if (!project || project.accountType !== "projeto") {
    throw notFound("Projeto nao encontrado");
  }

  const data = await loadAdmLoans({ ...filters, projectId });
  const visibleLoans = data.loans.filter((loan) => matchesLoanVisibility(loan.pending, data.visibility));

  return {
    adm_account: serializeAccount(data.admAccount),
    project: serializeAccount(project),
    as_of: data.cutoff.toISOString(),
    loan_status: data.visibility,
    adm_owes_projects: visibleLoans.filter((loan) => loan.direction === "adm_owes_projects"),
    projects_owe_adm: visibleLoans.filter((loan) => loan.direction === "projects_owe_adm"),
  };
}

export async function getAdmPositionExport(filters: LoanReportFilters = {}) {
  const data = await loadAdmLoans(filters);
  const position = buildAdmPosition(data);
  const visibleLoans = data.loans.filter((loan) => matchesLoanVisibility(loan.pending, data.visibility));
  const directionLabel = {
    adm_owes_projects: "ADM deve ao projeto",
    projects_owe_adm: "Projeto deve a ADM",
  };

  return {
    as_of: data.cutoff.toISOString(),
    consolidated: [
      ...position.adm_owes_projects.by_project.map((project) => ({
        direction: directionLabel.adm_owes_projects,
        project_name: project.account.name,
        project_account_number: project.account.account_number,
        borrowed: project.borrowed,
        returned: project.returned,
        pending: project.pending,
        open_loans_count: project.open_loans_count,
      })),
      ...position.projects_owe_adm.by_project.map((project) => ({
        direction: directionLabel.projects_owe_adm,
        project_name: project.account.name,
        project_account_number: project.account.account_number,
        borrowed: project.borrowed,
        returned: project.returned,
        pending: project.pending,
        open_loans_count: project.open_loans_count,
      })),
    ],
    movements: visibleLoans.flatMap((item) => [
      {
        direction: directionLabel[item.direction],
        project_name: item.project.name,
        project_account_number: item.project.account_number,
        movement_type: "Emprestimo",
        identifier: item.loan.unique_identifier,
        transaction_date: item.loan.transaction_date,
        description: item.loan.description,
        amount: item.loan.amount,
        source_account_number: item.loan.source_account_number,
        destination_account_number: item.loan.destination_account_number,
        loan_identifier: item.loan.unique_identifier,
        status: item.loan.status,
      },
      ...item.returns.map((movement) => ({
        direction: directionLabel[item.direction],
        project_name: item.project.name,
        project_account_number: item.project.account_number,
        movement_type: "Devolucao",
        identifier: movement.unique_identifier,
        transaction_date: movement.transaction_date,
        description: movement.description,
        amount: movement.amount,
        source_account_number: movement.source_account_number,
        destination_account_number: movement.destination_account_number,
        loan_identifier: item.loan.unique_identifier,
        status: movement.status,
      })),
    ]),
  };
}

export async function getInterProjectLoans(filters: LoanReportFilters = {}) {
  const cutoff = resolveLoanCutoff(filters.asOf);
  const visibility = filters.loanStatus ?? "open";
  const loans = await prisma.transaction.findMany({
    where: {
      transactionType: "emprestimo",
      transactionDate: { lte: cutoff },
      sourceAccount: { accountType: "projeto" },
      destinationAccount: { accountType: "projeto" },
    },
    include: getLoanInclude(cutoff),
    orderBy: { transactionDate: "asc" },
  });

  type PairEntry = {
    creditor: ReturnType<typeof serializeAccount>;
    debtor: ReturnType<typeof serializeAccount>;
    borrowed: number;
    returned: number;
    oldest_date: string;
    transactions: ReturnType<typeof serializeTransaction>[];
  };

  const byPair = new Map<string, PairEntry>();

  for (const loan of loans) {
    const snapshot = buildLoanSnapshot(loan, cutoff);
    if (!matchesLoanVisibility(snapshot.pending, visibility)) continue;

    const key = `${loan.sourceAccountId}__${loan.destinationAccountId}`;
    const dateStr = loan.transactionDate.toISOString();

    const existing = byPair.get(key);
    if (existing) {
      existing.borrowed += snapshot.borrowed;
      existing.returned += snapshot.returned;
      existing.transactions.push(snapshot.loan);
      if (dateStr < existing.oldest_date) existing.oldest_date = dateStr;
    } else {
      byPair.set(key, {
        creditor: serializeAccount(loan.sourceAccount),
        debtor: serializeAccount(loan.destinationAccount),
        borrowed: snapshot.borrowed,
        returned: snapshot.returned,
        oldest_date: dateStr,
        transactions: [snapshot.loan],
      });
    }
  }

  const pairs = [...byPair.values()]
    .map((p) => {
      const pending = p.borrowed - p.returned;
      const days_outstanding = Math.max(
        0,
        Math.floor((cutoff.getTime() - new Date(p.oldest_date).getTime()) / 86_400_000),
      );
      const return_percentage = p.borrowed > 0 ? (p.returned / p.borrowed) * 100 : 0;
      return { ...p, pending, days_outstanding, return_percentage };
    })
    .sort((a, b) => b.pending - a.pending);

  return {
    total_circulating: pairs.reduce((s, p) => s + p.pending, 0),
    active_pairs_count: pairs.length,
    oldest_loan_date: oldestDate(pairs),
    by_pair: pairs,
  };
}

export async function getReturnsReport(filters: TransactionFilters = {}) {
  const loans = await prisma.transaction.findMany({
    where: {
      ...buildTransactionWhere(filters),
      transactionType: "emprestimo",
      status: { in: ["pending_return", "partially_returned", "fully_returned"] },
    },
    include: {
      sourceAccount: { include: { coordinator: true } },
      destinationAccount: { include: { coordinator: true } },
      returns: {
        where: { transactionType: "devolucao" },
        include: {
          sourceAccount: { include: { coordinator: true } },
          destinationAccount: { include: { coordinator: true } },
        },
        orderBy: { transactionDate: "asc" },
      },
    },
    orderBy: { transactionDate: "desc" },
  });

  return loans.map((loan) => {
    const totalReturned = loan.returns.reduce((sum, item) => sum + Number(item.amount), 0);
    const loanAmount = Number(loan.amount);
    return {
      loan: serializeTransaction(loan),
      returns: loan.returns.map(serializeTransaction),
      totalReturned,
      returnPercentage: loanAmount > 0 ? (totalReturned / loanAmount) * 100 : 0,
      pendingAmount: loanAmount - totalReturned,
    };
  });
}
