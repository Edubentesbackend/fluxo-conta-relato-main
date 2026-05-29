import { prisma } from "../lib/prisma.js";
import { serializeAccount } from "../utils/serialize.js";
import type { AuthUser } from "../types.js";
import {
  normalizeAccountNumber,
  normalizeCoordinatorName,
} from "./account-normalization.js";
import type { Prisma } from "@prisma/client";

export interface CreateAccountInput {
  name: string;
  account_number: string;
  coordinator_name: string;
  description?: string | null;
}

export interface ImportAccountInput {
  account_number: string;
  name: string;
  coordinator_name: string;
  description?: string | null;
}

export interface ImportAccountsInput {
  filename?: string;
  accounts: ImportAccountInput[];
}

async function findOrCreateCoordinator(tx: Prisma.TransactionClient, coordinatorName: string) {
  const coordinator = normalizeCoordinatorName(coordinatorName);

  return tx.projectCoordinator.upsert({
    where: { normalizedName: coordinator.normalizedName },
    update: {},
    create: coordinator,
  });
}

export async function listAccounts() {
  const accounts = await prisma.account.findMany({
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
    coordinators.map((coordinator) => ({
      id: coordinator.id,
      name: coordinator.name,
      normalized_name: coordinator.normalizedName,
    })),
  );
}

export async function createAccount(input: CreateAccountInput) {
  return prisma.$transaction(async (tx) => {
    const coordinator = await findOrCreateCoordinator(tx, input.coordinator_name);
    const account = await tx.account.create({
      data: {
        name: input.name.trim(),
        accountNumber: normalizeAccountNumber(input.account_number),
        coordinatorId: coordinator.id,
        description: input.description?.trim() || null,
      },
      include: { coordinator: true },
    });
    return serializeAccount(account);
  });
}

export async function updateAccount(id: string, input: Partial<CreateAccountInput>) {
  return prisma.$transaction(async (tx) => {
    const coordinator = input.coordinator_name
      ? await findOrCreateCoordinator(tx, input.coordinator_name)
      : undefined;

    const account = await tx.account.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        accountNumber: input.account_number === undefined ? undefined : normalizeAccountNumber(input.account_number),
        coordinatorId: coordinator?.id,
        description: input.description === undefined ? undefined : input.description?.trim() || null,
      },
      include: { coordinator: true },
    });
    return serializeAccount(account);
  });
}

export async function importAccounts(input: ImportAccountsInput, user: AuthUser) {
  const normalized = input.accounts.map((account) => ({
    accountNumber: normalizeAccountNumber(account.account_number),
    name: account.name.trim(),
    coordinator: normalizeCoordinatorName(account.coordinator_name),
    description: account.description?.trim() || null,
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
      const coordinator = await tx.projectCoordinator.upsert({
        where: { normalizedName: account.coordinator.normalizedName },
        update: {},
        create: account.coordinator,
      });

      await tx.account.create({
        data: {
          accountNumber: account.accountNumber,
          name: account.name,
          description: account.description,
          coordinatorId: coordinator.id,
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
