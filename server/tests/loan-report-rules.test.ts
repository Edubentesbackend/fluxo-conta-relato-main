import { describe, expect, it } from "vitest";
import {
  calculateLoanSettlementSnapshot,
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

  it("does not settle loans without returns", () => {
    expect(calculateLoanSettlementSnapshot(100, loanDate, []))
      .toMatchObject({ settled: false, settledAt: null, returned: 0, pending: 100 });
  });

  it("does not settle partially returned loans", () => {
    expect(calculateLoanSettlementSnapshot(100, loanDate, [returns[0]]))
      .toMatchObject({ settled: false, settledAt: null, returned: 40, pending: 60 });
  });

  it("uses the return that zeroes the debt as the settlement date", () => {
    const settlement = calculateLoanSettlementSnapshot(100, loanDate, returns);
    expect(settlement).toMatchObject({
      settled: true,
      returned: 100,
      pending: 0,
      daysToSettlement: 19,
      status: "fully_returned",
    });
    expect(settlement.settledAt?.toISOString()).toBe("2026-04-20T12:00:00.000Z");
  });

  it("settles on the first return that reaches the loan amount", () => {
    const settlement = calculateLoanSettlementSnapshot(100, loanDate, [
      { amount: 20, transactionDate: new Date("2026-04-05T12:00:00.000Z") },
      { amount: 80, transactionDate: new Date("2026-04-08T12:00:00.000Z") },
      { amount: 10, transactionDate: new Date("2026-04-12T12:00:00.000Z") },
    ]);

    expect(settlement.settledAt?.toISOString()).toBe("2026-04-08T12:00:00.000Z");
    expect(settlement.returned).toBe(110);
    expect(settlement.pending).toBe(0);
  });
});
