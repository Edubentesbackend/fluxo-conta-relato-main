import { prisma } from "../lib/prisma.js";
import {
  buildPasswordCredential,
  PASSWORD_CREDENTIAL_TYPE,
} from "./password-service.js";
import type { UserRole } from "@prisma/client";

export interface CreateUserInput {
  username: string;
  email: string;
  name: string;
  password: string;
  role: UserRole;
  isActive: boolean;
}

export interface UpdateUserInput {
  username?: string;
  email?: string;
  name?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
}

export function serializeUser(user: {
  id: string;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    role: user.role,
    is_active: user.isActive,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
  };
}

export async function listUsers() {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
  return users.map(serializeUser);
}

export async function createUser(input: CreateUserInput) {
  const passwordCredential = await buildPasswordCredential(input.password);
  const user = await prisma.user.create({
    data: {
      username: input.username,
      email: input.email,
      name: input.name,
      role: input.role,
      isActive: input.isActive,
      credentials: { create: passwordCredential },
    },
  });
  return serializeUser(user);
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const passwordCredential = input.password ? await buildPasswordCredential(input.password) : null;
  const user = await prisma.user.update({
    where: { id },
    data: {
      username: input.username,
      email: input.email,
      name: input.name,
      role: input.role,
      isActive: input.isActive,
      ...(passwordCredential
        ? {
            credentials: {
              upsert: {
                where: {
                  userId_credentialType: {
                    userId: id,
                    credentialType: PASSWORD_CREDENTIAL_TYPE,
                  },
                },
                update: {
                  secretHash: passwordCredential.secretHash,
                  hashAlgorithm: passwordCredential.hashAlgorithm,
                  hashParams: passwordCredential.hashParams,
                  pepperVersion: passwordCredential.pepperVersion,
                },
                create: passwordCredential,
              },
            },
          }
        : {}),
    },
  });
  return serializeUser(user);
}
