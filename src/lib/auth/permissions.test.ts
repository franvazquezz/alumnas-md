import { describe, expect, it } from "vitest";

import { canManageStudio, canReadStudent } from "./permissions";

const student = { studioId: 1, userId: "student-1" };

describe("authorization permissions", () => {
  it("allows owners and admins to manage a studio", () => {
    expect(canManageStudio("OWNER")).toBe(true);
    expect(canManageStudio("ADMIN")).toBe(true);
    expect(canManageStudio("STUDENT")).toBe(false);
  });

  it("allows a student to read only their linked record", () => {
    expect(
      canReadStudent(
        { userId: "student-1", role: "STUDENT", studioId: 1 },
        student,
      ),
    ).toBe(true);
    expect(
      canReadStudent(
        { userId: "student-2", role: "STUDENT", studioId: 1 },
        student,
      ),
    ).toBe(false);
  });

  it("rejects access across studios for every role", () => {
    expect(
      canReadStudent(
        { userId: "owner-1", role: "OWNER", studioId: 2 },
        student,
      ),
    ).toBe(false);
  });
});
