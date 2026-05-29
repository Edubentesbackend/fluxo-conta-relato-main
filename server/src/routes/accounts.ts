import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createAccount,
  createProjectCoordinator,
  importAccounts,
  listAccounts,
  listProjectCoordinators,
  updateAccount,
} from "../services/account-service.js";
import type { CreateAccountInput, ImportAccountsInput } from "../services/account-service.js";
import type { AuthUser } from "../types.js";

const coordinatorNameSchema = z.string().trim().min(1).regex(/^[\p{L}\s]+$/u);

const accountSchema = z.object({
  name: z.string().min(1),
  account_number: z.string().trim().min(2),
  coordinator_name: z.string().trim().regex(/^[\p{L}\s]*$/u).optional().nullable(),
  description: z.string().optional().nullable(),
  account_type: z.enum(["projeto", "adm", "transitoria"]).optional().nullable(),
});

const createCoordinatorSchema = z.object({
  name: coordinatorNameSchema,
});

const importAccountItemSchema = z.object({
  name: z.string().min(1),
  account_number: z.string().trim().min(2),
  coordinator_name: z.string().trim().regex(/^[\p{L}\s]*$/u).optional().nullable(),
  description: z.string().optional().nullable(),
  account_type: z.enum(["projeto", "adm", "transitoria"]).optional().nullable(),
});

const importSchema = z.object({
  filename: z.string().optional(),
  accounts: z.array(importAccountItemSchema).min(1),
});

export async function accountRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: app.authenticate }, async () => {
    return listAccounts();
  });

  app.get("/coordinators", { preHandler: app.authenticate }, async () => {
    return listProjectCoordinators();
  });

  app.post("/coordinators", { preHandler: app.requireRoles(["manager"]) }, async (request, reply) => {
    const input = createCoordinatorSchema.parse(request.body);
    reply.code(201);
    return createProjectCoordinator(input.name);
  });

  app.post("/", { preHandler: app.requireRoles(["manager"]) }, async (request, reply) => {
    const input = accountSchema.parse(request.body) as CreateAccountInput;
    reply.code(201);
    return createAccount(input);
  });

  app.patch("/:id", { preHandler: app.requireRoles(["manager"]) }, async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const input = accountSchema.partial().parse(request.body);
    return updateAccount(params.id, input);
  });

  app.post("/import", { preHandler: app.requireRoles(["manager"]) }, async (request, reply) => {
    const input = importSchema.parse(request.body) as ImportAccountsInput;
    const user = request.user as AuthUser;
    reply.code(201);
    return importAccounts(input, user);
  });
}
