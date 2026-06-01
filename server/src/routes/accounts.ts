import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createAccount,
  createProjectCoordinator,
  deleteAccount,
  deleteProjectCoordinator,
  importAccounts,
  listAccounts,
  listProjectCoordinators,
  restoreAccount,
  updateAccount,
  updateProjectCoordinator,
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
  app.get("/", { preHandler: app.authenticate }, async (request) => {
    const query = z.object({
      include_archived: z.enum(["true", "false"]).optional(),
    }).parse(request.query);
    return listAccounts(query.include_archived === "true");
  });

  app.get("/coordinators", { preHandler: app.authenticate }, async () => {
    return listProjectCoordinators();
  });

  app.post("/coordinators", { preHandler: app.requireRoles(["manager"]) }, async (request, reply) => {
    const input = createCoordinatorSchema.parse(request.body);
    reply.code(201);
    return createProjectCoordinator(input.name);
  });

  app.patch("/coordinators/:id", { preHandler: app.requireRoles(["manager"]) }, async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const input = z.object({ name: coordinatorNameSchema }).parse(request.body);
    return updateProjectCoordinator(params.id, input.name);
  });

  app.delete("/coordinators/:id", { preHandler: app.requireRoles(["admin"]) }, async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const user = request.user as AuthUser;
    return deleteProjectCoordinator(params.id, user.sub, request.ip);
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

  app.delete("/:id", { preHandler: app.requireRoles(["admin"]) }, async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const user = request.user as AuthUser;
    return deleteAccount(params.id, user.sub, request.ip);
  });

  app.post("/:id/restore", { preHandler: app.requireRoles(["admin"]) }, async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const user = request.user as AuthUser;
    return restoreAccount(params.id, user.sub, request.ip);
  });

  app.post("/import", { preHandler: app.requireRoles(["manager"]) }, async (request, reply) => {
    const input = importSchema.parse(request.body) as ImportAccountsInput;
    const user = request.user as AuthUser;
    reply.code(201);
    return importAccounts(input, user);
  });
}
