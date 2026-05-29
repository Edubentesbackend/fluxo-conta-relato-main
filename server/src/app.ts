import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { env, corsOrigins } from "./env.js";
import { ApiError } from "./utils/errors.js";
import { authPlugin } from "./plugins/auth.js";
import { authRoutes } from "./routes/auth.js";
import { userRoutes } from "./routes/users.js";
import { accountRoutes } from "./routes/accounts.js";
import { transactionRoutes } from "./routes/transactions.js";
import { reportRoutes } from "./routes/reports.js";
import { aiRoutes } from "./routes/ai.js";
import { statusRoutes } from "./routes/status.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed"), false);
    },
    credentials: true,
  });

  app.register(jwt, { secret: env.JWT_SECRET });
  app.register(authPlugin);

  app.register(statusRoutes, { prefix: "/api" });
  app.register(authRoutes, { prefix: "/api/auth" });
  app.register(userRoutes, { prefix: "/api/users" });
  app.register(accountRoutes, { prefix: "/api/accounts" });
  app.register(transactionRoutes, { prefix: "/api/transactions" });
  app.register(reportRoutes, { prefix: "/api/reports" });
  app.register(aiRoutes, { prefix: "/api/ai" });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    if (error instanceof ApiError) {
      reply.status(error.statusCode).send({ error: error.message, code: error.code });
      return;
    }

    if (error instanceof ZodError) {
      reply.status(400).send({
        error: "Payload invalido",
        code: "VALIDATION_ERROR",
        issues: error.issues,
      });
      return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        reply.status(409).send({ error: "Registro duplicado", code: "UNIQUE_CONSTRAINT" });
        return;
      }
      if (error.code === "P2025") {
        reply.status(404).send({ error: "Registro nao encontrado", code: "NOT_FOUND" });
        return;
      }
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      reply.status(503).send({
        error: "Banco de dados indisponivel. Verifique se o PostgreSQL esta rodando em localhost:5432.",
        code: "DATABASE_UNAVAILABLE",
      });
      return;
    }

    reply.status(500).send({ error: "Erro interno", code: "INTERNAL_ERROR" });
  });

  return app;
}
