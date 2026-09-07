import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies the original password and rejects a different one", async () => {
    const hash = await hashPassword("una-clave-segura-2026");

    expect(await verifyPassword("una-clave-segura-2026", hash)).toBe(true);
    expect(await verifyPassword("otra-clave", hash)).toBe(false);
  });

  it("uses a different salt for every hash", async () => {
    const first = await hashPassword("una-clave-segura-2026");
    const second = await hashPassword("una-clave-segura-2026");

    expect(first).not.toBe(second);
  });

  it("rejects malformed stored values", async () => {
    expect(await verifyPassword("clave", "not-a-valid-hash")).toBe(false);
  });
});
