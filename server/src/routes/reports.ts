import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { TransactionType } from "@prisma/client";
import {
  getAccountBreakdown,
  getAccountSummaries,
  getAdmPositionExport,
  getAdmProjectDetails,
  getAdmPosition,
  getInterProjectLoans,
  getMonthlyVolumes,
  getReturnsReport,
  getTransactionInsights,
} from "../services/report-service.js";
import type { TransactionFilters } from "../services/transaction-service.js";

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
  flow_scope: z.enum(["all", "adm", "between_projects"]).optional(),
});

const loanFiltersSchema = z.object({
  asOf: z.string().datetime().optional(),
  projectId: z.string().uuid().optional(),
  loanStatus: z.enum(["open", "settled", "all"]).optional(),
});

function parseFilters(query: unknown): TransactionFilters {
  const filters = filtersSchema.parse(query);
  return {
    ...filters,
    transactionType: filters.transactionType as TransactionType | undefined,
  };
}

export async function reportRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/insights", async (request) => {
    return getTransactionInsights(parseFilters(request.query));
  });

  app.get("/monthly-volumes", async (request) => {
    const query = z.object({ monthsBack: z.coerce.number().int().positive().optional() })
      .merge(filtersSchema)
      .parse(request.query);
    return getMonthlyVolumes({
      ...query,
      transactionType: query.transactionType as TransactionType | undefined,
    }, query.monthsBack || 12);
  });

  app.get("/account-summaries", async (request) => {
    return getAccountSummaries(parseFilters(request.query));
  });

  app.get("/accounts/:id/breakdown", async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    return getAccountBreakdown(params.id, parseFilters(request.query));
  });

  app.get("/returns", async (request) => {
    return getReturnsReport(parseFilters(request.query));
  });

  app.get("/adm-position", async (request) => {
    return getAdmPosition(loanFiltersSchema.parse(request.query));
  });

  app.get("/adm-position/export", async (request) => {
    return getAdmPositionExport(loanFiltersSchema.parse(request.query));
  });

  app.get("/adm-position/projects/:projectId", async (request) => {
    const params = z.object({ projectId: z.string().uuid() }).parse(request.params);
    return getAdmProjectDetails(params.projectId, loanFiltersSchema.omit({ projectId: true }).parse(request.query));
  });

  app.get("/inter-project-loans", async (request) => {
    return getInterProjectLoans(loanFiltersSchema.parse(request.query));
  });
}
