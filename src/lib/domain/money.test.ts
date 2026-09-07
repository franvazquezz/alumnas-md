import { describe, expect, it } from "vitest";

import {
  calculateFinancialSummary,
  moneyToCents,
  normalizeMoney,
} from "./money";

describe("money", () => {
  it("normalizes valid values to two decimal places", () => {
    expect(normalizeMoney("1250")).toBe("1250.00");
    expect(normalizeMoney("12,5")).toBe("12.50");
    expect(moneyToCents("12.50")).toBe(1250);
  });

  it("rejects negative, malformed, and over-precise values", () => {
    expect(normalizeMoney("-1")).toBeNull();
    expect(normalizeMoney("gratis")).toBeNull();
    expect(normalizeMoney("1.001")).toBeNull();
  });

  it("includes class, kiln, and material charges in totals and debt", () => {
    expect(
      calculateFinancialSummary([
        { amount: "100.00", status: "PAID" },
        { amount: "20.50", status: "PENDING" },
        { amount: "5.25", status: "PAID" },
      ]),
    ).toEqual({ total: "125.75", paid: "105.25", debt: "20.50" });
  });
});
