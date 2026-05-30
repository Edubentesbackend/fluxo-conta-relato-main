import { Prisma, type TransactionType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { badRequest, notFound } from "../utils/errors.js";
import { serializeTransaction } from "../utils/serialize.js";
import {
  getLoanStatus,
  validateBasicTransactionRules,
  validateReturnTransactionRules,
} from "./transaction-rules.js";
import type { TransactionFilters } from "../types.js";

export type { TransactionFilters };

export interface CreateTransactionInput {
  source_account_id: string;
  destination_account_id: string;
  transaction_date: string;
  amount: number;
  transaction_type: TransactionType;
  description: string;
  parent_transaction_id?: string | null;
}

export function buildTransactionWhere(filters: TransactionFilters = {}): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = {};

  if (filters.startDate || filters.endDate) {
    where.transactionDate = {};
    if (filters.startDate) where.transactionDate.gte = new Date(filters.startDate);
    if (filters.endDate) where.transactionDate.lte = new Date(filters.endDate);
  }

  if (filters.transactionType) where.transactionType = filters.transactionType;

  const andClauses: Prisma.TransactionWhereInput[] = [];

  if (filters.accountId) {
    andClauses.push({
      OR: [
        { sourceAccountId: filters.accountId },
        { destinationAccountId: filters.accountId },
      ],
    });
  }

  if (filters.flow_scope === "adm") {
    andClauses.push({
      OR: [
        { sourceAccount: { accountType: "adm" } },
        { destinationAccount: { accountType: "adm" } },
      ],
    });
  } else if (filters.flow_scope === "between_projects") {
    andClauses.push({ sourceAccount: { accountType: "projeto" } });
    andClauses.push({ destinationAccount: { accountType: "projeto" } });
  }

  if (andClauses.length > 0) {
    where.AND = andClauses;
  }

  if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
    where.amount = {};
    if (filters.minAmount !== undefined) where.amount.gte = new Prisma.Decimal(filters.minAmount);
    if (filters.maxAmount !== undefined) where.amount.lte = new Prisma.Decimal(filters.maxAmount);
  }
  if (filters.description) {
    where.description = { contains: filters.description, mode: "insensitive" };
  }

  return where;
}

async function nextTransactionIdentifier(tx: Prisma.TransactionClient) {
  const prefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${prefix}))`;

  const rows = await tx.$queryRaw<{ last_identifier: string | null }[]>`
    SELECT MAX(unique_identifier) AS last_identifier
    FROM transactions
    WHERE unique_identifier LIKE ${`${prefix}-%`}
  `;

  const last = rows[0]?.last_identifier;
  const nextNumber = last ? Number(last.split("-")[1] || "0") + 1 : 1;
  return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
}

async function assertAccountsExist(tx: Prisma.TransactionClient, sourceId: string, destinationId: string) {
  if (sourceId === destinationId) {
    throw badRequest("A conta de origem deve ser diferente da conta de destino");
  }

  const count = await tx.account.count({
    where: { id: { in: [sourceId, destinationId] } },
  });

  if (count !== 2) {
    throw badRequest("Conta de origem ou destino nao encontrada");
  }
}

async function updateLoanStatus(tx: Prisma.TransactionClient, loanId: string) {
  const loan = await tx.transaction.findUnique({ where: { id: loanId } });
  if (!loan) throw notFound("Emprestimo nao encontrado");

  const aggregate = await tx.transaction.aggregate({
    where: {
      parentTransactionId: loanId,
      transactionType: "devolucao",
    },
    _sum: { amount: true },
  });

  const returnedAmount = Number(aggregate._sum.amount || 0);
  const loanAmount = Number(loan.amount);
  const status = getLoanStatus(loanAmount, returnedAmount);

  await tx.transaction.update({
    where: { id: loanId },
    data: { status },
  });
}

export async function listTransactions(filters: TransactionFilters = {}) {
  const transactions = await prisma.transaction.findMany({
    where: buildTransactionWhere(filters),
    include: {
      sourceAccount: { include: { coordinator: true } },
      destinationAccount: { include: { coordinator: true } },
    },
    orderBy: { transactionDate: "desc" },
  });

  return transactions.map(serializeTransaction);
}

export async function createTransaction(input: CreateTransactionInput, createdById?: string) {
  const transactionDate = new Date(input.transaction_date);
  validateBasicTransactionRules({
    sourceAccountId: input.source_account_id,
    destinationAccountId: input.destination_account_id,
    transactionDate,
    amount: input.amount,
  });

  return prisma.$transaction(async (tx) => {
    await assertAccountsExist(tx, input.source_account_id, input.destination_account_id);

    let status: "pending_return" | "completed" = "completed";

    if (input.transaction_type === "emprestimo") {
      status = "pending_return";
    }

    if (input.transaction_type === "devolucao") {
      if (!input.parent_transaction_id) {
        throw badRequest("Devolucao exige parent_transaction_id do emprestimo original");
      }

      const parent = await tx.transaction.findUnique({
        where: { id: input.parent_transaction_id },
      });

      if (!parent || parent.transactionType !== "emprestimo") {
        throw badRequest("parent_transaction_id deve apontar para uma transacao de emprestimo");
      }

      if (
        input.source_account_id !== parent.destinationAccountId ||
        input.destination_account_id !== parent.sourceAccountId
      ) {
        throw badRequest("A devolucao deve inverter origem e destino do emprestimo original");
      }

      const aggregate = await tx.transaction.aggregate({
        where: {
          parentTransactionId: parent.id,
          transactionType: "devolucao",
        },
        _sum: { amount: true },
      });
      const alreadyReturned = Number(aggregate._sum.amount || 0);
      validateReturnTransactionRules({
        loanDate: parent.transactionDate,
        returnDate: transactionDate,
        loanAmount: Number(parent.amount),
        alreadyReturned,
        returnAmount: input.amount,
      });
    }

    const transaction = await tx.transaction.create({
      data: {
        uniqueIdentifier: await nextTransactionIdentifier(tx),
        sourceAccountId: input.source_account_id,
        destinationAccountId: input.destination_account_id,
        transactionDate,
        amount: new Prisma.Decimal(input.amount),
        transactionType: input.transaction_type,
        description: input.description,
        parentTransactionId: input.parent_transaction_id || null,
        status,
        createdById,
      },
      include: {
        sourceAccount: { include: { coordinator: true } },
        destinationAccount: { include: { coordinator: true } },
      },
    });

    if (input.transaction_type === "devolucao" && input.parent_transaction_id) {
      await updateLoanStatus(tx, input.parent_transaction_id);
    }

    return serializeTransaction(transaction);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function createReturnTransaction(
  loanId: string,
  input: Omit<CreateTransactionInput, "transaction_type" | "parent_transaction_id">,
  createdById?: string,
) {
  const loan = await prisma.transaction.findUnique({ where: { id: loanId } });
  if (!loan || loan.transactionType !== "emprestimo") {
    throw notFound("Emprestimo nao encontrado");
  }

  return createTransaction({
    ...input,
    source_account_id: loan.destinationAccountId,
    destination_account_id: loan.sourceAccountId,
    transaction_type: "devolucao",
    parent_transaction_id: loanId,
  }, createdById);
}
