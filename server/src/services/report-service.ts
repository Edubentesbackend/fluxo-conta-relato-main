import { prisma } from "../lib/prisma.js";
import { positionFromBalance, serializeAccount, serializeTransaction } from "../utils/serialize.js";
import { buildTransactionWhere, type TransactionFilters } from "./transaction-service.js";
import type { AccountType } from "@prisma/client";

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

export async function getAdmPosition(filters: TransactionFilters = {}) {
  const loans = await prisma.transaction.findMany({
    where: {
      ...buildTransactionWhere(filters),
      transactionType: "emprestimo",
      status: { in: ["pending_return", "partially_returned"] },
      AND: [
        {
          OR: [
            { sourceAccount: { accountType: "adm" } },
            { destinationAccount: { accountType: "adm" } },
          ],
        },
        { NOT: { sourceAccount: { accountType: "transitoria" } } },
        { NOT: { destinationAccount: { accountType: "transitoria" } } },
      ],
    },
    include: {
      sourceAccount: { include: { coordinator: true } },
      destinationAccount: { include: { coordinator: true } },
      returns: { where: { transactionType: "devolucao" } },
    },
    orderBy: { transactionDate: "asc" },
  });

  const byProject = new Map<string, {
    account: ReturnType<typeof serializeAccount>;
    borrowed: number;
    returned: number;
    oldest_date: string;
    transactions: ReturnType<typeof serializeTransaction>[];
  }>();

  for (const loan of loans) {
    const srcType = loan.sourceAccount.accountType as AccountType;
    const dstType = loan.destinationAccount.accountType as AccountType;

    // The project account is the non-ADM side
    const projectAccount = srcType === "projeto" ? loan.sourceAccount : loan.destinationAccount;

    const loanAmount = Number(loan.amount);
    const returnedAmount = loan.returns.reduce((sum, r) => sum + Number(r.amount), 0);

    const existing = byProject.get(projectAccount.id);
    if (existing) {
      existing.borrowed += loanAmount;
      existing.returned += returnedAmount;
      existing.transactions.push(serializeTransaction(loan));
      if (loan.transactionDate.toISOString() < existing.oldest_date) {
        existing.oldest_date = loan.transactionDate.toISOString();
      }
    } else {
      byProject.set(projectAccount.id, {
        account: serializeAccount(projectAccount),
        borrowed: loanAmount,
        returned: returnedAmount,
        oldest_date: loan.transactionDate.toISOString(),
        transactions: [serializeTransaction(loan)],
      });
    }
  }

  const projects = [...byProject.values()]
    .map((p) => ({ ...p, pending: p.borrowed - p.returned }))
    .filter((p) => p.pending > 0)
    .sort((a, b) => b.pending - a.pending);

  const total_adm_debt = projects.reduce((sum, p) => sum + p.pending, 0);

  const oldest = projects.reduce<string | null>((acc, p) => {
    if (!acc) return p.oldest_date;
    return p.oldest_date < acc ? p.oldest_date : acc;
  }, null);

  return {
    total_adm_debt,
    creditor_projects_count: projects.length,
    oldest_loan_date: oldest,
    by_project: projects,
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
