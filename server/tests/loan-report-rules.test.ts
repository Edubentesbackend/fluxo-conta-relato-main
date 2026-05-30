import { describe, expect, it } from "vitest";
import {
  calculateHistoricalLoanSnapshot,
  matchesLoanVisibility,
} from "../src/services/loan-report-rules.js";

describe("loan report rules", () => {
  const loanDate = new Date("2026-04-01T12:00:00.000Z");
  const returns = [
    { amount: 40, transactionDate: new Date("2026-04-10T12:00:00.000Z") },
    { amount: 60, transactionDate: new Date("2026-04-20T12:00:00.000Z") },
  ];

  it("calculates historical positions before and after returns", () => {
    expect(calculateHistoricalLoanSnapshot(100, loanDate, returns, new Date("2026-04-05T12:00:00.000Z")))
      .toMatchObject({ returned: 0, pending: 100, status: "pending_return" });
    expect(calculateHistoricalLoanSnapshot(100, loanDate, returns, new Date("2026-04-15T12:00:00.000Z")))
      .toMatchObject({ returned: 40, pending: 60, status: "partially_returned" });
    expect(calculateHistoricalLoanSnapshot(100, loanDate, returns, new Date("2026-04-25T12:00:00.000Z")))
      .toMatchObject({ returned: 100, pending: 0, status: "fully_returned" });
  });

  it("filters open and settled loans", () => {
    expect(matchesLoanVisibility(10, "open")).toBe(true);
    expect(matchesLoanVisibility(0, "open")).toBe(false);
    expect(matchesLoanVisibility(0, "settled")).toBe(true);
    expect(matchesLoanVisibility(10, "settled")).toBe(false);
    expect(matchesLoanVisibility(10, "all")).toBe(true);
  });
});
