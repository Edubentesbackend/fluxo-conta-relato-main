import { describe, expect, it } from "vitest";
import { resolveAccountDeletionOutcome, resolveAccountType } from "../src/services/account-rules.js";

describe("account rules", () => {
  it("forces account 12671-3 to be ADM", () => {
    expect(resolveAccountType("12671-3", "projeto")).toBe("adm");
    expect(resolveAccountType("12671-3")).toBe("adm");
  });

  it("rejects another account classified as ADM", () => {
    expect(() => resolveAccountType("8722-X", "adm")).toThrow("Somente a conta 12671-3");
  });

  it("archives used accounts and deletes unused accounts", () => {
    expect(resolveAccountDeletionOutcome("8722-X", 1)).toBe("archived");
    expect(resolveAccountDeletionOutcome("8722-X", 0)).toBe("deleted");
  });

  it("never removes the fixed ADM account", () => {
    expect(() => resolveAccountDeletionOutcome("12671-3", 0)).toThrow("nao pode ser excluida");
  });
});
