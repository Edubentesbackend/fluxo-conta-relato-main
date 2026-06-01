import { prisma } from "../lib/prisma.js";
import { serializeAccount } from "../utils/serialize.js";
import type { AuthUser } from "../types.js";
import { conflict, notFound } from "../utils/errors.js";
import {
  normalizeAccountNumber,
  normalizeCoordinatorName,
} from "./account-normalization.js";
import { resolveAccountDeletionOutcome, resolveAccountType } from "./account-rules.js";
import type { AccountType, Prisma } from "@prisma/client";

export interface CreateAccountInput {
  name: string;
  account_number: string;
  coordinator_name?: string | null;
  description?: string | null;
  account_type?: AccountType | null;
}

export interface ImportAccountInput {
  account_number: string;
  name: string;
  coordinator_name?: string | null;
  description?: string | null;
  account_type?: AccountType | null;
}

export interface ImportAccountsInput {
  filename?: string;
  accounts: ImportAccountInput[];
}

type ProjectCoordinatorLike = {
  id: string;
  name: string;
  normalizedName: string;
};

function serializeProjectCoordinator(coordinator: ProjectCoordinatorLike) {
  return {
    id: coordinator.id,
    name: coordinator.name,
    normalized_name: coordinator.normalizedName,
  };
}

function normalizeOptionalCoordinatorName(coordinatorName?: string | null) {
  const value = coordinatorName?.trim();
  return value ? normalizeCoordinatorName(value) : null;
}

async function findOrCreateCoordinator(tx: Prisma.TransactionClient, coordinatorName?: string | null) {
  const coordinator = normalizeOptionalCoordinatorName(coordinatorName);

  if (!coordinator) return null;

  return tx.projectCoordinator.upsert({
    where: { normalizedName: coordinator.normalizedName },
    update: {},
    create: coordinator,
  });
}

export async function listAccounts(includeArchived = false) {
  const accounts = await prisma.account.findMany({
    where: includeArchived ? undefined : { archivedAt: null },
    include: { coordinator: true },
    orderBy: { name: "asc" },
  });
  return accounts.map(serializeAccount);
}

export async function listProjectCoordinators() {
  return prisma.projectCoordinator.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      normalizedName: true,
    },
  }).then((coordinators) =>
    coordinators.map(serializeProjectCoordinator),
  );
}

export async function updateProjectCoordinator(id: string, name: string) {
  const coordinator = normalizeCoordinatorName(name);
  const existing = await prisma.projectCoordinator.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) throw notFound("Coordenador nao encontrado");

  const conflictingCoordinator = await prisma.projectCoordinator.findFirst({
    where: { normalizedName: coordinator.normalizedName, NOT: { id } },
    select: { id: true },
  });

  if (conflictingCoordinator) throw conflict("Coordenador com esse nome ja existe", "COORDINATOR_ALREADY_EXISTS");

  const updated = await prisma.projectCoordinator.update({
    where: { id },
    data: coordinator,
    select: { id: true, name: true, normalizedName: true },
  });

  return serializeProjectCoordinator(updated);
}

export async function createProjectCoordinator(name: string) {
  const coordinator = normalizeCoordinatorName(name);
  const existing = await prisma.projectCoordinator.findUnique({
    where: { normalizedName: coordinator.normalizedName },
    select: { id: true, name: true, normalizedName: true },
  });

  if (existing) {
    throw conflict("Coordenador ja cadastrado", "COORDINATOR_ALREADY_EXISTS");
  }

  const created = await prisma.projectCoordinator.create({
    data: coordinator,
    select: { id: true, name: true, normalizedName: true },
  });

  return serializeProjectCoordinator(created);
}

export async function createAccount(input: CreateAccountInput) {
  return prisma.$transaction(async (tx) => {
    const coordinator = await findOrCreateCoordinator(tx, input.coordinator_name);
    const accountNumber = normalizeAccountNumber(input.account_number);
    const account = await tx.account.create({
      data: {
        name: input.name.trim(),
        accountNumber,
        coordinatorId: coordinator?.id ?? null,
        description: input.description?.trim() || null,
        accountType: resolveAccountType(accountNumber, input.account_type),
      },
      include: { coordinator: true },
    });
    return serializeAccount(account);
  });
}

export async function updateAccount(id: string, input: Partial<CreateAccountInput>) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.account.findUnique({
      where: { id },
      select: { accountNumber: true, accountType: true, archivedAt: true },
    });
    if (!existing) throw notFound("Conta nao encontrada");
    if (existing.archivedAt) throw conflict("Conta arquivada nao pode ser editada", "ACCOUNT_ARCHIVED");

    const shouldUpdateCoordinator = Object.prototype.hasOwnProperty.call(input, "coordinator_name");
    const coordinator = shouldUpdateCoordinator
      ? await findOrCreateCoordinator(tx, input.coordinator_name)
      : undefined;
    const accountNumber = input.account_number === undefined
      ? existing.accountNumber
      : normalizeAccountNumber(input.account_number);
    const requestedType = input.account_type ?? existing.accountType;

    const account = await tx.account.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        accountNumber: input.account_number === undefined ? undefined : accountNumber,
        coordinatorId: shouldUpdateCoordinator ? coordinator?.id ?? null : undefined,
        description: input.description === undefined ? undefined : input.description?.trim() || null,
        accountType: accountNumber ? resolveAccountType(accountNumber, requestedType) : requestedType,
      },
      include: { coordinator: true },
    });
    return serializeAccount(account);
  });
}

interface AuditInput {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
}

async function createAuditLog(tx: Prisma.TransactionClient, input: AuditInput) {
  await tx.auditLog.create({
    data: {
      userId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
      ipAddress: input.ipAddress,
    },
  });
}

export async function deleteAccount(id: string, actorId: string, ipAddress?: string) {
  return prisma.$transaction(async (tx) => {
    const account = await tx.account.findUnique({
      where: { id },
      select: { id: true, accountNumber: true, archivedAt: true },
    });
    if (!account) throw notFound("Conta nao encontrada");
    if (account.archivedAt) throw conflict("Conta ja esta arquivada", "ACCOUNT_ALREADY_ARCHIVED");

    const linkedTransactions = await tx.transaction.count({
      where: {
        OR: [
          { sourceAccountId: id },
          { destinationAccountId: id },
        ],
      },
    });
    const outcome = resolveAccountDeletionOutcome(account.accountNumber, linkedTransactions);

    if (outcome === "archived") {
      await tx.account.update({
        where: { id },
        data: { archivedAt: new Date() },
      });
    } else {
      await tx.account.delete({ where: { id } });
    }

    await createAuditLog(tx, {
      actorId,
      action: outcome === "archived" ? "account.archived" : "account.deleted",
      entityType: "account",
      entityId: id,
      metadata: { linked_transactions: linkedTransactions },
      ipAddress,
    });

    return {
      id,
      outcome,
      linked_transactions: linkedTransactions,
    };
  });
}

export async function restoreAccount(id: string, actorId: string, ipAddress?: string) {
  return prisma.$transaction(async (tx) => {
    const account = await tx.account.findUnique({
      where: { id },
      select: { id: true, archivedAt: true },
    });
    if (!account) throw notFound("Conta nao encontrada");
    if (!account.archivedAt) throw conflict("Conta nao esta arquivada", "ACCOUNT_NOT_ARCHIVED");

    await tx.account.update({
      where: { id },
      data: { archivedAt: null },
    });

    await createAuditLog(tx, {
      actorId,
      action: "account.restored",
      entityType: "account",
      entityId: id,
      ipAddress,
    });

    return { id, outcome: "restored" as const };
  });
}

export async function deleteProjectCoordinator(id: string, actorId: string, ipAddress?: string) {
  return prisma.$transaction(async (tx) => {
    const coordinator = await tx.projectCoordinator.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!coordinator) throw notFound("Coordenador nao encontrado");

    const updated = await tx.account.updateMany({
      where: { coordinatorId: id },
      data: { coordinatorId: null },
    });
    await tx.projectCoordinator.delete({ where: { id } });

    await createAuditLog(tx, {
      actorId,
      action: "project_coordinator.deleted",
      entityType: "project_coordinator",
      entityId: id,
      metadata: { unlinked_accounts: updated.count },
      ipAddress,
    });

    return {
      id,
      outcome: "deleted" as const,
      unlinked_accounts: updated.count,
    };
  });
}

export async function importAccounts(input: ImportAccountsInput, user: AuthUser) {
  const normalized = input.accounts.map((account) => ({
    accountNumber: normalizeAccountNumber(account.account_number),
    name: account.name.trim(),
    coordinator: normalizeOptionalCoordinatorName(account.coordinator_name),
    description: account.description?.trim() || null,
    requestedAccountType: account.account_type,
  })).map((account) => ({
    ...account,
    accountType: resolveAccountType(account.accountNumber, account.requestedAccountType),
  }));

  const existing = await prisma.account.findMany({
    where: {
      OR: [
        { accountNumber: { in: normalized.map((a) => a.accountNumber) } },
        { name: { in: normalized.map((a) => a.name) } },
      ],
    },
    select: { accountNumber: true, name: true },
  });

  const existingNumbers = new Set(existing.map((a) => a.accountNumber).filter(Boolean));
  const existingNames = new Set(existing.map((a) => a.name));
  const seenNumbers = new Set<string>();
  const seenNames = new Set<string>();
  const errors: Array<{ row: number; reason: string }> = [];

  const toCreate = normalized.filter((account, index) => {
    if (existingNumbers.has(account.accountNumber) || seenNumbers.has(account.accountNumber)) {
      errors.push({ row: index + 1, reason: "Numero de conta duplicado" });
      return false;
    }
    if (existingNames.has(account.name) || seenNames.has(account.name)) {
      errors.push({ row: index + 1, reason: "Nome de conta duplicado" });
      return false;
    }
    seenNumbers.add(account.accountNumber);
    seenNames.add(account.name);
    return true;
  });

  const result = await prisma.$transaction(async (tx) => {
    let importedRows = 0;

    for (const account of toCreate) {
      const coordinator = account.coordinator
        ? await tx.projectCoordinator.upsert({
          where: { normalizedName: account.coordinator.normalizedName },
          update: {},
          create: account.coordinator,
        })
        : null;

      await tx.account.create({
        data: {
          accountNumber: account.accountNumber,
          name: account.name,
          description: account.description,
          coordinatorId: coordinator?.id ?? null,
          accountType: account.accountType,
        },
      });
      importedRows += 1;
    }

    const batch = await tx.importBatch.create({
      data: {
        source: "frontend",
        filename: input.filename,
        totalRows: input.accounts.length,
        importedRows,
        skippedRows: input.accounts.length - importedRows,
        errors,
        createdById: user.sub,
      },
    });
    return { importedRows, batch };
  });

  return {
    batch_id: result.batch.id,
    imported: result.importedRows,
    skipped: input.accounts.length - result.importedRows,
    errors,
  };
}
