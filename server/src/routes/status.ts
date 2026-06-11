import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

export async function statusRoutes(app: FastifyInstance) {
  app.get("/health/live", async () => {
    return { ok: true, service: "fluxo-conta-relato-api" };
  });

  app.get("/health/ready", async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, service: "fluxo-conta-relato-api", database: "ready" };
  });

  app.get("/health", async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, service: "fluxo-conta-relato-api", database: "ready" };
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
      ],
    };
  });
}
