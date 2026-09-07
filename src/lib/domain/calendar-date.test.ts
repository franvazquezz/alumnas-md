import { describe, expect, it } from "vitest";

import {
  calendarDateFromDatabase,
  calendarDateInTimeZone,
  calendarDateToDatabase,
  daysUntilNextBirthday,
  formatCalendarDate,
  isCalendarDate,
  STUDIO_TIME_ZONE,
} from "./calendar-date";

describe("calendar dates", () => {
  it("validates real calendar dates", () => {
    expect(isCalendarDate("2024-02-29")).toBe(true);
    expect(isCalendarDate("2024-02-30")).toBe(false);
    expect(isCalendarDate("02/01/2000")).toBe(false);
  });

  it("round-trips a database DATE without shifting it", () => {
    const source = "2000-01-02";
    expect(calendarDateFromDatabase(calendarDateToDatabase(source))).toBe(
      source,
    );
    expect(formatCalendarDate(source)).toBe("02/01/2000");
  });

  it("uses the Córdoba calendar day near UTC midnight", () => {
    expect(
      calendarDateInTimeZone(
        new Date("2026-09-02T02:30:00.000Z"),
        STUDIO_TIME_ZONE,
      ),
    ).toBe("2026-09-01");
  });

  it("orders birthdays using calendar days", () => {
    expect(daysUntilNextBirthday("1990-09-02", "2026-09-02")).toBe(0);
    expect(daysUntilNextBirthday("1990-09-01", "2026-09-02")).toBe(364);
  });
});
