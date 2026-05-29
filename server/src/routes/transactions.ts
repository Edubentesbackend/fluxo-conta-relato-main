import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { TransactionType } from "@prisma/client";
import type { AuthUser } from "../types.js";
import {
  createReturnTransaction,
  createTransaction,
  listTransactions,
  type TransactionFilters,
} from "../services/transaction-service.js";

const transactionTypeSchema = z.enum([
  "emprestimo",
  "devolucao",
  "ajuste",
  "rateio",
  "correcao",
  "estorno",
  "transferencia_operacional",
]);

const filtersSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  transactionType: transactionTypeSchema.optional(),
  accountId: z.string().uuid().optional(),
  minAmount: z.coerce.number().positive().optional(),
  maxAmount: z.coerce.number().positive().optional(),
  description: z.string().optional(),
});

const createTransactionSchema = z.object({
  source_account_id: z.string().uuid(),
  destination_account_id: z.string().uuid(),
  transaction_date: z.string().datetime(),
  amount: z.coerce.number().positive(),
  transaction_type: transactionTypeSchema,
  description: z.string().min(1),
  parent_transaction_id: z.string().uuid().nullable().optional(),
});

const createReturnSchema = z.object({
  transaction_date: z.string().datetime(),
  amount: z.coerce.number().positive(),
  description: z.string().min(1),
});

function parseFilters(query: unknown): TransactionFilters {
  const filters = filtersSchema.parse(query);
  return {
    ...filters,
    transactionType: filters.transactionType as TransactionType | undefined,
  };
}

export async function transactionRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: app.authenticate }, async (request) => {
    return listTransactions(parseFilters(request.query));
  });

  app.post("/", { preHandler: app.requireRoles(["analyst"]) }, async (request, reply) => {
    const user = request.user as AuthUser;
    const input = createTransactionSchema.parse(request.body);
    const transaction = await createTransaction({
      source_account_id: input.source_account_id,
      destination_account_id: input.destination_account_id,
      transaction_date: input.transaction_date,
      amount: input.amount,
      transaction_type: input.transaction_type as TransactionType,
      description: input.description,
      parent_transaction_id: input.parent_transaction_id,
    }, user.sub);
    reply.code(201);
    return transaction;
  });

  app.post("/:id/returns", { preHandler: app.requireRoles(["analyst"]) }, async (request, reply) => {
    const user = request.user as AuthUser;
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const input = createReturnSchema.parse(request.body);
    const transaction = await createReturnTransaction(params.id, {
      source_account_id: "",
      destination_account_id: "",
      transaction_date: input.transaction_date,
      amount: input.amount,
      description: input.description,
    }, user.sub);
    reply.code(201);
    return transaction;
  });
}
