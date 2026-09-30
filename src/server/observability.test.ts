import { describe, expect, it, vi } from "vitest";

import {
  createServerLogEntry,
  resolveRequestId,
  writeServerLog,
} from "./observability";

describe("server observability", () => {
  it("preserves a safe incoming request ID", () => {
    const headers = new Headers({ "x-request-id": "edge_01:request-2" });
    expect(resolveRequestId(headers)).toBe("edge_01:request-2");
  });

  it("replaces malformed or oversized request IDs", () => {
    for (const value of ["contains spaces", "x".repeat(129)]) {
      const requestId = resolveRequestId(
        new Headers({ "x-request-id": value }),
      );
      expect(requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    }
  });

  it("creates machine-readable entries and writes one JSON line", () => {
    const entry = createServerLogEntry("info", "test.completed", {
      requestId: "req-1",
      durationMs: 12,
      ok: true,
    });
    expect(entry).toMatchObject({
      level: "info",
      service: "alumnas-md",
      event: "test.completed",
      requestId: "req-1",
      durationMs: 12,
      ok: true,
    });
    expect(entry.timestamp).toEqual(expect.any(String));

    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    writeServerLog("info", "test.completed", { requestId: "req-1" });
    expect(JSON.parse(String(info.mock.calls[0]?.[0]))).toMatchObject({
      event: "test.completed",
      requestId: "req-1",
    });
    info.mockRestore();
  });
});
