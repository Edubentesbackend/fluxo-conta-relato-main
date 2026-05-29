import { prisma } from "../lib/prisma.js";
import { serializeAccount } from "../utils/serialize.js";
import type { AuthUser } from "../types.js";
import { conflict } from "../utils/errors.js";
import {
  normalizeAccountNumber,
  normalizeCoordinatorName,
} from "./account-normalization.js";
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
    coordinators.map(serializeProjectCoordinator),
  );
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
    const account = await tx.account.create({
      data: {
        name: input.name.trim(),
        accountNumber: normalizeAccountNumber(input.account_number),
        coordinatorId: coordinator?.id ?? null,
        description: input.description?.trim() || null,
        accountType: input.account_type ?? "projeto",
      },
      include: { coordinator: true },
    });
    return serializeAccount(account);
  });
}

export async function updateAccount(id: string, input: Partial<CreateAccountInput>) {
  return prisma.$transaction(async (tx) => {
    const shouldUpdateCoordinator = Object.prototype.hasOwnProperty.call(input, "coordinator_name");
    const coordinator = shouldUpdateCoordinator
      ? await findOrCreateCoordinator(tx, input.coordinator_name)
      : undefined;

    const account = await tx.account.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        accountNumber: input.account_number === undefined ? undefined : normalizeAccountNumber(input.account_number),
        coordinatorId: shouldUpdateCoordinator ? coordinator?.id ?? null : undefined,
        description: input.description === undefined ? undefined : input.description?.trim() || null,
        accountType: input.account_type ?? undefined,
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
    coordinator: normalizeOptionalCoordinatorName(account.coordinator_name),
    description: account.description?.trim() || null,
    accountType: account.account_type ?? "projeto" as AccountType,
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
