import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import {
  hashPassword,
  LEGACY_BCRYPT_ALGORITHM,
  PASSWORD_HASH_ALGORITHM,
  verifyPassword,
} from "../src/services/password-service.js";

describe("password-service", () => {
  it("hashes and verifies passwords with argon2id", async () => {
    const hash = await hashPassword("admin12345");

    expect(hash).toContain("$argon2id$");
    await expect(verifyPassword("admin12345", hash, PASSWORD_HASH_ALGORITHM)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash, PASSWORD_HASH_ALGORITHM)).resolves.toBe(false);
  });

  it("verifies legacy bcrypt hashes for migration", async () => {
    const legacyHash = await bcrypt.hash("admin12345", 12);

    await expect(verifyPassword("admin12345", legacyHash, LEGACY_BCRYPT_ALGORITHM)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", legacyHash, LEGACY_BCRYPT_ALGORITHM)).resolves.toBe(false);
  });
});
