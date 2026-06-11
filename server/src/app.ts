import Fastify from "fastify";
import cors from "@fastify/cors";
import staticPlugin from "@fastify/static";
import jwt from "@fastify/jwt";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
import { statusRoutes } from "./routes/status.js";

const currentDir = dirname(fileURLToPath(import.meta.url));

function findFrontendDist() {
  const candidates = [
    resolve(process.cwd(), "dist"),
    resolve(currentDir, "..", "..", "dist"),
    resolve(currentDir, "..", "..", "..", "dist"),
  ];

  return candidates.find((candidate) => existsSync(resolve(candidate, "index.html")));
}

function isStaticAssetRequest(url: string) {
  const pathname = url.split("?")[0] || "/";

  return (
    pathname.startsWith("/assets/") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname === "/robots.txt" ||
    pathname === "/sw.js" ||
    /\.(?:js|css|map|json|png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|otf)$/i.test(pathname)
  );
}

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"],
  });

  app.addHook("onSend", async (request, reply, payload) => {
    if (request.url.startsWith("/api/")) {
      reply.header("cache-control", "no-store");
    } else if (request.url === "/" || request.url.endsWith(".html")) {
      reply.header("cache-control", "no-store");
    }
    return payload;
  });

  app.register(jwt, { secret: env.JWT_SECRET });
  app.register(authPlugin);

  app.register(statusRoutes, { prefix: "/api" });
  app.register(authRoutes, { prefix: "/api/auth" });
  app.register(userRoutes, { prefix: "/api/users" });
  app.register(accountRoutes, { prefix: "/api/accounts" });
  app.register(transactionRoutes, { prefix: "/api/transactions" });
  app.register(reportRoutes, { prefix: "/api/reports" });

  const frontendDist = findFrontendDist();
  if (frontendDist) {
    app.register(staticPlugin, {
      root: frontendDist,
      prefix: "/",
      cacheControl: false,
      setHeaders: (response, filePath) => {
        const shouldRevalidate = filePath.endsWith("index.html") || filePath.endsWith("sw.js");
        response.setHeader(
          "cache-control",
          shouldRevalidate ? "no-store" : "public, max-age=31536000, immutable",
        );
      },
    });
  }

  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith("/api/") || !frontendDist || isStaticAssetRequest(request.url)) {
      reply.status(404).send({ error: "Rota nao encontrada", code: "NOT_FOUND" });
      return;
    }

    reply.header("cache-control", "no-store").sendFile("index.html", { cacheControl: false });
  });

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

    if (
      error &&
      typeof error === "object" &&
      "statusCode" in error &&
      typeof error.statusCode === "number" &&
      error.statusCode >= 400 &&
      error.statusCode < 500
    ) {
      const requestError = error as { statusCode: number; message?: string; code?: string };
      reply.status(requestError.statusCode).send({
        error: requestError.message || "Requisicao invalida",
        code: requestError.code || "REQUEST_ERROR",
      });
      return;
    }

    reply.status(500).send({ error: "Erro interno", code: "INTERNAL_ERROR" });
  });

  return app;
}
