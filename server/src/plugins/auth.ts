import fp from "fastify-plugin";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { forbidden, unauthorized } from "../utils/errors.js";
import type { AuthUser } from "../types.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRoles: (roles: UserRole[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const roleRank: Record<UserRole, number> = {
  viewer: 1,
  analyst: 2,
  manager: 3,
  admin: 4,
};

export const authPlugin = fp(async (app) => {
  app.decorate("authenticate", async (request) => {
    try {
      await request.jwtVerify<AuthUser>();
    } catch {
      throw unauthorized();
    }

    const user = request.user as AuthUser;
    const activeUser = await prisma.user.findUnique({
      where: { id: user.sub },
      select: { id: true, isActive: true },
    });

    if (!activeUser?.isActive) {
      throw unauthorized("Usuario inativo ou inexistente");
    }
  });

  app.decorate("requireRoles", (roles: UserRole[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      await app.authenticate(request, reply);
      const user = request.user as AuthUser;
      const allowed = roles.some((role) => roleRank[user.role] >= roleRank[role]);
      if (!allowed) throw forbidden();
    };
  });
});
