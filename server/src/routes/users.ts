import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createUser, listUsers, updateUser } from "../services/user-service.js";
import type { CreateUserInput, UpdateUserInput } from "../services/user-service.js";

const roleSchema = z.enum(["admin", "manager", "analyst", "viewer"]);

const createUserSchema = z.object({
  username: z.string().min(3).regex(/^[a-zA-Z0-9_]+$/, "Apenas letras, números e underscore"),
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

export async function userRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.requireRoles(["admin"]));

  app.get("/", async () => {
    return listUsers();
  });

  app.post("/", async (request, reply) => {
    const input = createUserSchema.parse(request.body) as CreateUserInput;
    reply.code(201);
    return createUser(input);
  });

  app.patch("/:id", async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const input = updateUserSchema.parse(request.body) as UpdateUserInput;
    return updateUser(params.id, input);
  });
}
