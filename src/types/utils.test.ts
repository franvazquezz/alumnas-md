import { describe, expect, it } from "vitest";

import { formatMonth, getWeekday } from "./utils";

describe("structured schedule values", () => {
  it("renders periods and weekdays from structured values", () => {
    expect(formatMonth(2026, 9)).toBe("Septiembre 2026");
    expect(getWeekday("WEDNESDAY")?.label).toBe("Miércoles");
  });
});
