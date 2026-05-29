import type { FastifyInstance } from "fastify";
import { env } from "../env.js";
import { prisma } from "../lib/prisma.js";

export async function statusRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, service: "fluxo-conta-relato-api" };
  });

  app.get("/status/integrations", { preHandler: app.authenticate }, async () => {
    const started = Date.now();
    let databaseStatus: "online" | "offline" = "online";
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      databaseStatus = "offline";
    }

    return {
      services: [
        {
          id: "database",
          name: "Banco de Dados",
          status: databaseStatus,
          responseTime: Date.now() - started,
          description: "PostgreSQL principal",
        },
        {
          id: "auth",
          name: "Autenticacao",
          status: "online",
          responseTime: 0,
          description: "JWT e refresh tokens locais",
        },
        {
          id: "claude",
          name: "Claude IA",
          status: env.ANTHROPIC_API_KEY ? "online" : "warning",
          responseTime: 0,
          description: env.ANTHROPIC_API_KEY ? "Chave configurada" : "ANTHROPIC_API_KEY ausente",
        },
      ],
    };
  });
}
