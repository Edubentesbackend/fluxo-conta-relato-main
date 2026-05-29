import { describe, expect, it } from "vitest";
import {
  normalizeAccountNumber,
  normalizeCoordinatorName,
  normalizeCoordinatorSearchName,
} from "../src/services/account-normalization.js";

describe("account normalization", () => {
  it("formats account numbers with the last digit after a dash", () => {
    expect(normalizeAccountNumber("126712")).toBe("12671-2");
    expect(normalizeAccountNumber("12671-2")).toBe("12671-2");
    expect(normalizeAccountNumber("12671x")).toBe("12671-X");
    expect(normalizeAccountNumber("12671-X")).toBe("12671-X");
  });

  it("rejects invalid account number formats", () => {
    expect(() => normalizeAccountNumber("12671-22")).toThrow("Numero da conta");
    expect(() => normalizeAccountNumber("12X3")).toThrow("Numero da conta");
    expect(() => normalizeAccountNumber("1")).toThrow("Numero da conta");
  });

  it("standardizes coordinator names for display and lookup", () => {
    expect(normalizeCoordinatorName("  marcus   lacerda ").name).toBe("Marcus Lacerda");
    expect(normalizeCoordinatorSearchName("Márcus Lacerda")).toBe("marcus lacerda");
  });

  it("rejects coordinator names with numbers or symbols", () => {
    expect(() => normalizeCoordinatorName("Marcus123")).toThrow("coordenador");
    expect(() => normalizeCoordinatorName("Marcus-Lacerda")).toThrow("coordenador");
  });
});
