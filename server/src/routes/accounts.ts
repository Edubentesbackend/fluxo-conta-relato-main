import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { serializeAccount } from "../utils/serialize.js";
import type { AuthUser } from "../types.js";

const accountSchema = z.object({
  name: z.string().min(1),
  account_number: z.string().trim().min(1).optional().nullable(),
  description: z.string().optional().nullable(),
});

const importSchema = z.object({
  filename: z.string().optional(),
  accounts: z.array(accountSchema.extend({ account_number: z.string().trim().min(1) })).min(1),
});

export async function accountRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: app.authenticate }, async () => {
    const accounts = await prisma.account.findMany({ orderBy: { name: "asc" } });
    return accounts.map(serializeAccount);
  });

  app.post("/", { preHandler: app.requireRoles(["manager"]) }, async (request, reply) => {
    const input = accountSchema.parse(request.body);
    const account = await prisma.account.create({
      data: {
        name: input.name.trim(),
        accountNumber: input.account_number?.trim() || null,
        description: input.description?.trim() || null,
      },
    });
    reply.code(201);
    return serializeAccount(account);
  });

  app.patch("/:id", { preHandler: app.requireRoles(["manager"]) }, async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const input = accountSchema.partial().parse(request.body);
    const account = await prisma.account.update({
      where: { id: params.id },
      data: {
        name: input.name?.trim(),
        accountNumber: input.account_number === undefined ? undefined : input.account_number?.trim() || null,
        description: input.description === undefined ? undefined : input.description?.trim() || null,
      },
    });
    return serializeAccount(account);
  });

  app.post("/import", { preHandler: app.requireRoles(["manager"]) }, async (request, reply) => {
    const input = importSchema.parse(request.body);
    const user = request.user as AuthUser;
    const normalized = input.accounts.map((account) => ({
      accountNumber: account.account_number.trim(),
      name: account.name.trim(),
      description: account.description?.trim() || null,
    }));

    const existing = await prisma.account.findMany({
      where: {
        OR: [
          { accountNumber: { in: normalized.map((account) => account.accountNumber) } },
          { name: { in: normalized.map((account) => account.name) } },
        ],
      },
      select: { accountNumber: true, name: true },
    });

    const existingNumbers = new Set(existing.map((account) => account.accountNumber).filter(Boolean));
    const existingNames = new Set(existing.map((account) => account.name));
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
      const created = await tx.account.createMany({
        data: toCreate,
        skipDuplicates: true,
      });
      const batch = await tx.importBatch.create({
        data: {
          source: "frontend",
          filename: input.filename,
          totalRows: input.accounts.length,
          importedRows: created.count,
          skippedRows: input.accounts.length - created.count,
          errors,
          createdById: user.sub,
        },
      });
      return { created, batch };
    });

    reply.code(201);
    return {
      batch_id: result.batch.id,
      imported: result.created.count,
      skipped: input.accounts.length - result.created.count,
      errors,
    };
  });
}
