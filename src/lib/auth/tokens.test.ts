import { describe, expect, it } from "vitest";

import { generateOpaqueToken, hashOpaqueToken, normalizeEmail } from "./tokens";

describe("authentication tokens", () => {
  it("normalizes email addresses", () => {
    expect(normalizeEmail("  ALUMNA@Example.COM ")).toBe("alumna@example.com");
  });

  it("creates opaque, non-repeatable tokens and hashes them", () => {
    const first = generateOpaqueToken();
    const second = generateOpaqueToken();

    expect(first).not.toBe(second);
    expect(hashOpaqueToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashOpaqueToken(first)).not.toBe(first);
  });
});
