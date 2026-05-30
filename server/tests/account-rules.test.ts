import { describe, expect, it } from "vitest";
import { resolveAccountType } from "../src/services/account-rules.js";

describe("account rules", () => {
  it("forces account 12671-3 to be ADM", () => {
    expect(resolveAccountType("12671-3", "projeto")).toBe("adm");
    expect(resolveAccountType("12671-3")).toBe("adm");
  });

  it("rejects another account classified as ADM", () => {
    expect(() => resolveAccountType("8722-X", "adm")).toThrow("Somente a conta 12671-3");
  });
});
