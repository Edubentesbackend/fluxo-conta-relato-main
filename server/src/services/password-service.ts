import argon2 from "argon2";
import bcrypt from "bcryptjs";
import { createHmac } from "node:crypto";
import { env } from "../env.js";

export const PASSWORD_CREDENTIAL_TYPE = "password";
export const PASSWORD_HASH_ALGORITHM = "argon2id";
export const LEGACY_BCRYPT_ALGORITHM = "bcrypt";
export const PASSWORD_PEPPER_VERSION = "v1";

export const passwordHashParams = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
};

export function pepperPassword(password: string) {
  return createHmac("sha256", env.PASSWORD_PEPPER).update(password, "utf8").digest("hex");
}

export async function hashPassword(password: string) {
  return argon2.hash(pepperPassword(password), {
    type: argon2.argon2id,
    memoryCost: passwordHashParams.memoryCost,
    timeCost: passwordHashParams.timeCost,
    parallelism: passwordHashParams.parallelism,
  });
}

export async function verifyPassword(password: string, hash: string, algorithm: string) {
  if (algorithm === PASSWORD_HASH_ALGORITHM) {
    return argon2.verify(hash, pepperPassword(password));
  }

  if (algorithm === LEGACY_BCRYPT_ALGORITHM) {
    return bcrypt.compare(password, hash);
  }

  return false;
}

export async function buildPasswordCredential(password: string) {
  return {
    credentialType: PASSWORD_CREDENTIAL_TYPE,
    secretHash: await hashPassword(password),
    hashAlgorithm: PASSWORD_HASH_ALGORITHM,
    hashParams: passwordHashParams,
    pepperVersion: PASSWORD_PEPPER_VERSION,
  };
}
