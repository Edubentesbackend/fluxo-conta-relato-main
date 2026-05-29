import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { env } from "../env.js";
import { prisma } from "../lib/prisma.js";
import { badRequest, unauthorized } from "../utils/errors.js";
import type { AuthUser } from "../types.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function serializeUser(user: {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "analyst" | "viewer";
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

async function issueTokens(app: FastifyInstance, user: {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "analyst" | "viewer";
}) {
  const payload: Omit<AuthUser, "sub"> = {
    email: user.email,
    name: user.name,
    role: user.role,
  };

  const accessToken = app.jwt.sign(payload, {
    sub: user.id,
    expiresIn: env.JWT_EXPIRES_IN,
  });

  const refreshToken = randomBytes(48).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_DAYS);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken,
    user: serializeUser(user),
  };
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/login", async (request) => {
    const input = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    if (!user?.isActive) throw unauthorized("Credenciais invalidas");

    const passwordOk = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordOk) throw unauthorized("Credenciais invalidas");

    return issueTokens(app, user);
  });

  app.post("/refresh", async (request) => {
    const input = refreshSchema.parse(request.body);
    const tokenHash = hashToken(input.refreshToken);
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!storedToken?.user.isActive) throw unauthorized("Refresh token invalido");

    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    return issueTokens(app, storedToken.user);
  });

  app.post("/logout", { preHandler: app.authenticate }, async (request) => {
    const input = refreshSchema.partial().parse(request.body || {});
    if (input.refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(input.refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { ok: true };
  });

  app.get("/me", { preHandler: app.authenticate }, async (request) => {
    const authUser = request.user as AuthUser;
    const user = await prisma.user.findUnique({
      where: { id: authUser.sub },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!user) throw badRequest("Usuario nao encontrado");
    return { user: serializeUser(user) };
  });
}
