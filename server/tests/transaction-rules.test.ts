import { describe, expect, it } from "vitest";
import { getLoanStatus, validateBasicTransactionRules } from "../src/services/transaction-rules.js";

describe("transaction rules", () => {
  it("rejects same source and destination account", () => {
    expect(() => validateBasicTransactionRules({
      sourceAccountId: "same",
      destinationAccountId: "same",
      transactionDate: new Date(),
      amount: 10,
    })).toThrow("origem deve ser diferente");
  });

  it("rejects non-positive amounts", () => {
    expect(() => validateBasicTransactionRules({
      sourceAccountId: "a",
      destinationAccountId: "b",
      transactionDate: new Date(),
      amount: 0,
    })).toThrow("maior que zero");
  });

  it("calculates loan return status", () => {
    expect(getLoanStatus(100, 0)).toBe("pending_return");
    expect(getLoanStatus(100, 40)).toBe("partially_returned");
    expect(getLoanStatus(100, 100)).toBe("fully_returned");
    expect(getLoanStatus(100, 120)).toBe("fully_returned");
  });
});
