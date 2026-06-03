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

export interface UpdateTransactionInput {
  amount: number;
  description?: string;
  reason: string;
}

export interface VoidTransactionInput {
  reason: string;
}

const TRANSACTION_ACCOUNT_INCLUDE = {
  sourceAccount: { include: { coordinator: true } },
  destinationAccount: { include: { coordinator: true } },
} as const;

export function buildTransactionWhere(filters: TransactionFilters = {}): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = { voidedAt: null };

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

async function assertAccountsCanBeUsed(
  tx: Prisma.TransactionClient,
  sourceId: string,
  destinationId: string,
  allowArchived: boolean,
) {
  if (sourceId === destinationId) {
    throw badRequest("A conta de origem deve ser diferente da conta de destino");
  }

  const accounts = await tx.account.findMany({
    where: { id: { in: [sourceId, destinationId] } },
    select: { id: true, archivedAt: true },
  });

  if (accounts.length !== 2) {
    throw badRequest("Conta de origem ou destino nao encontrada");
  }

  if (!allowArchived && accounts.some((account) => account.archivedAt)) {
    throw badRequest("Conta arquivada nao pode receber novas movimentacoes", "ACCOUNT_ARCHIVED");
  }
}

async function updateLoanStatus(tx: Prisma.TransactionClient, loanId: string) {
  const loan = await tx.transaction.findUnique({ where: { id: loanId } });
  if (!loan) throw notFound("Emprestimo nao encontrado");
  if (loan.voidedAt) return;

  const aggregate = await tx.transaction.aggregate({
    where: {
      parentTransactionId: loanId,
      transactionType: "devolucao",
      voidedAt: null,
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

type TransactionSnapshotInput = {
  id: string;
  uniqueIdentifier: string;
  sourceAccountId: string;
  destinationAccountId: string;
  transactionDate: Date;
  amount: Prisma.Decimal | number;
  transactionType: TransactionType;
  description: string;
  parentTransactionId: string | null;
  status: string;
  createdById: string | null;
  voidedAt?: Date | null;
  voidedById?: string | null;
  voidReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function serializeAuditSnapshot(transaction: TransactionSnapshotInput): Prisma.InputJsonObject {
  return {
    id: transaction.id,
    unique_identifier: transaction.uniqueIdentifier,
    source_account_id: transaction.sourceAccountId,
    destination_account_id: transaction.destinationAccountId,
    transaction_date: transaction.transactionDate.toISOString(),
    amount: Number(transaction.amount),
    transaction_type: transaction.transactionType,
    description: transaction.description,
    parent_transaction_id: transaction.parentTransactionId,
    status: transaction.status,
    created_by_id: transaction.createdById,
    voided_at: transaction.voidedAt?.toISOString() ?? null,
    voided_by_id: transaction.voidedById ?? null,
    void_reason: transaction.voidReason ?? null,
    created_at: transaction.createdAt.toISOString(),
    updated_at: transaction.updatedAt.toISOString(),
  };
}

async function createTransactionAuditEvent(
  tx: Prisma.TransactionClient,
  input: {
    transactionId: string;
    action: "updated" | "voided";
    before: Prisma.InputJsonObject;
    after?: Prisma.InputJsonObject;
    reason: string;
    actorId: string;
    ipAddress?: string;
  },
) {
  await tx.transactionAuditEvent.create({
    data: {
      transactionId: input.transactionId,
      action: input.action,
      before: input.before,
      after: input.after ?? null,
      reason: input.reason,
      createdById: input.actorId,
    },
  });

  await tx.auditLog.create({
    data: {
      userId: input.actorId,
      action: `transaction.${input.action}`,
      entityType: "transaction",
      entityId: input.transactionId,
      metadata: {
        reason: input.reason,
        before: input.before,
        after: input.after ?? null,
      },
      ipAddress: input.ipAddress,
    },
  });
}

async function assertReturnTotalWithinLoan(
  tx: Prisma.TransactionClient,
  loanId: string,
  returnAmount: number,
  ignoredReturnId?: string,
) {
  const loan = await tx.transaction.findUnique({
    where: { id: loanId },
    select: { id: true, amount: true, transactionType: true, voidedAt: true },
  });

  if (!loan || loan.transactionType !== "emprestimo" || loan.voidedAt) {
    throw badRequest("Emprestimo original indisponivel para esta devolucao");
  }

  const aggregate = await tx.transaction.aggregate({
    where: {
      parentTransactionId: loanId,
      transactionType: "devolucao",
      voidedAt: null,
      ...(ignoredReturnId ? { NOT: { id: ignoredReturnId } } : {}),
    },
    _sum: { amount: true },
  });

  const alreadyReturned = Number(aggregate._sum.amount || 0);
  if (alreadyReturned + returnAmount > Number(loan.amount)) {
    throw badRequest("A soma das devolucoes nao pode ultrapassar o valor do emprestimo");
  }
}

async function assertLoanAmountCoversReturns(
  tx: Prisma.TransactionClient,
  loanId: string,
  loanAmount: number,
) {
  const aggregate = await tx.transaction.aggregate({
    where: {
      parentTransactionId: loanId,
      transactionType: "devolucao",
      voidedAt: null,
    },
    _sum: { amount: true },
  });

  const returnedAmount = Number(aggregate._sum.amount || 0);
  if (returnedAmount > loanAmount) {
    throw badRequest("O valor do emprestimo nao pode ser menor que as devolucoes ativas");
  }
}

export async function listTransactions(filters: TransactionFilters = {}) {
  const transactions = await prisma.transaction.findMany({
    where: buildTransactionWhere(filters),
    include: TRANSACTION_ACCOUNT_INCLUDE,
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
    allowFutureDate: input.transaction_type === "devolucao",
  });

  return prisma.$transaction(async (tx) => {
    await assertAccountsCanBeUsed(
      tx,
      input.source_account_id,
      input.destination_account_id,
      input.transaction_type === "devolucao",
    );

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

      if (!parent || parent.transactionType !== "emprestimo" || parent.voidedAt) {
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
          voidedAt: null,
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
      include: TRANSACTION_ACCOUNT_INCLUDE,
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
  if (!loan || loan.transactionType !== "emprestimo" || loan.voidedAt) {
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

export async function updateTransaction(
  id: string,
  input: UpdateTransactionInput,
  actorId: string,
  ipAddress?: string,
) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw badRequest("Valor deve ser maior que zero");
  }

  const reason = input.reason.trim();
  if (!reason) throw badRequest("Motivo da correcao e obrigatorio");

  return prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findUnique({ where: { id } });
    if (!existing) throw notFound("Transacao nao encontrada");
    if (existing.voidedAt) throw badRequest("Transacao cancelada nao pode ser editada");

    if (existing.transactionType === "devolucao") {
      if (!existing.parentTransactionId) throw badRequest("Devolucao sem emprestimo vinculado nao pode ser editada");
      await assertReturnTotalWithinLoan(tx, existing.parentTransactionId, input.amount, existing.id);
    }

    if (existing.transactionType === "emprestimo") {
      await assertLoanAmountCoversReturns(tx, existing.id, input.amount);
    }

    const before = serializeAuditSnapshot(existing);
    const updated = await tx.transaction.update({
      where: { id },
      data: {
        amount: new Prisma.Decimal(input.amount),
        description: input.description?.trim() || existing.description,
      },
      include: TRANSACTION_ACCOUNT_INCLUDE,
    });
    const after = serializeAuditSnapshot(updated);

    if (existing.transactionType === "emprestimo") {
      await updateLoanStatus(tx, existing.id);
    } else if (existing.transactionType === "devolucao" && existing.parentTransactionId) {
      await updateLoanStatus(tx, existing.parentTransactionId);
    }

    await createTransactionAuditEvent(tx, {
      transactionId: id,
      action: "updated",
      before,
      after,
      reason,
      actorId,
      ipAddress,
    });

    return serializeTransaction(updated);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function voidTransaction(
  id: string,
  input: VoidTransactionInput,
  actorId: string,
  ipAddress?: string,
) {
  const reason = input.reason.trim();
  if (!reason) throw badRequest("Motivo do cancelamento e obrigatorio");

  return prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findUnique({ where: { id } });
    if (!existing) throw notFound("Transacao nao encontrada");
    if (existing.voidedAt) throw badRequest("Transacao ja esta cancelada");

    const before = serializeAuditSnapshot(existing);
    const updated = await tx.transaction.update({
      where: { id },
      data: {
        voidedAt: new Date(),
        voidedById: actorId,
        voidReason: reason,
      },
      include: TRANSACTION_ACCOUNT_INCLUDE,
    });
    const after = serializeAuditSnapshot(updated);

    if (existing.transactionType === "devolucao" && existing.parentTransactionId) {
      await updateLoanStatus(tx, existing.parentTransactionId);
    }

    await createTransactionAuditEvent(tx, {
      transactionId: id,
      action: "voided",
      before,
      after,
      reason,
      actorId,
      ipAddress,
    });

    return serializeTransaction(updated);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
