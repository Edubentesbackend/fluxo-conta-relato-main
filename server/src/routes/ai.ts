import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../env.js";
import { prisma } from "../lib/prisma.js";
import type { AuthUser } from "../types.js";
import { ApiError } from "../utils/errors.js";
import { getMonthlyVolumes, getTransactionInsights } from "../services/report-service.js";

const filtersSchema = z.object({
  filters: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    transactionType: z.enum([
      "emprestimo",
      "devolucao",
      "ajuste",
      "rateio",
      "correcao",
      "estorno",
      "transferencia_operacional",
    ]).optional(),
    accountId: z.string().uuid().optional(),
    minAmount: z.coerce.number().positive().optional(),
    maxAmount: z.coerce.number().positive().optional(),
    description: z.string().optional(),
  }).optional().default({}),
});

function extractClaudeText(response: any) {
  const content = response?.content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((item) => item?.type === "text")
    .map((item) => item.text)
    .join("\n")
    .trim();
}

export async function aiRoutes(app: FastifyInstance) {
  app.post("/executive-insights", { preHandler: app.authenticate }, async (request) => {
    if (!env.ANTHROPIC_API_KEY) {
      throw new ApiError(503, "ANTHROPIC_API_KEY nao configurada", "CLAUDE_NOT_CONFIGURED");
    }

    const user = request.user as AuthUser;
    const input = filtersSchema.parse(request.body || {});
    const [insights, monthlyData] = await Promise.all([
      getTransactionInsights(input.filters),
      getMonthlyVolumes(input.filters, 12),
    ]);

    const prompt = `Analise os dados financeiros abaixo e gere 3 insights executivos acionaveis em portugues.

Volume total: ${insights.total_volume}
Quantidade de transacoes: ${insights.transaction_count}
Ticket medio: ${insights.avg_transaction_amount}
Conta mais ativa: ${insights.most_active_account_name} (${insights.most_active_account_transactions} transacoes)
Maior transacao: ${insights.highest_value_transaction_amount}
Tipo mais comum: ${insights.most_common_transaction_type}
Dados mensais recentes: ${JSON.stringify(monthlyData.slice(-6))}

Regras: seja objetivo, destaque riscos, tendencias e acoes recomendadas.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: env.CLAUDE_MODEL,
        max_tokens: 700,
        system: "Voce e um analista financeiro executivo. Responda em portugues do Brasil.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(response.status, `Erro ao chamar Claude: ${errorText}`, "CLAUDE_ERROR");
    }

    const data = await response.json();
    const text = extractClaudeText(data);

    await prisma.aiInsightRun.create({
      data: {
        userId: user.sub,
        filters: input.filters,
        prompt,
        response: text,
        model: env.CLAUDE_MODEL,
      },
    });

    return { insights: text, model: env.CLAUDE_MODEL };
  });
}
