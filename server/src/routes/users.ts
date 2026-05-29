import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const roleSchema = z.enum(["admin", "manager", "analyst", "viewer"]);

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  role: roleSchema.default("viewer"),
  isActive: z.boolean().default(true),
});

const updateUserSchema = createUserSchema
  .omit({ password: true })
  .partial()
  .extend({ password: z.string().min(8).optional() });

function serializeUser(user: {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "analyst" | "viewer";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    is_active: user.isActive,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
  };
}

export async function userRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.requireRoles(["admin"]));

  app.get("/", async () => {
    const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
    return users.map(serializeUser);
  });

  app.post("/", async (request, reply) => {
    const input = createUserSchema.parse(request.body);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        role: input.role,
        isActive: input.isActive,
        passwordHash: await bcrypt.hash(input.password, 12),
      },
    });
    reply.code(201);
    return serializeUser(user);
  });

  app.patch("/:id", async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const input = updateUserSchema.parse(request.body);
    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        email: input.email,
        name: input.name,
        role: input.role,
        isActive: input.isActive,
        ...(input.password ? { passwordHash: await bcrypt.hash(input.password, 12) } : {}),
      },
    });
    return serializeUser(user);
  });
}
