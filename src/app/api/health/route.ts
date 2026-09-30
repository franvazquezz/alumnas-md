import { type NextRequest } from "next/server";

import { db } from "~/server/db";
import {
  requestIdHeader,
  resolveRequestId,
  writeServerLog,
} from "~/server/observability";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req.headers);
  const startedAt = Date.now();

  try {
    await db.$queryRaw`SELECT 1`;
    const durationMs = Date.now() - startedAt;
    writeServerLog("info", "health.completed", {
      requestId,
      durationMs,
      ok: true,
    });
    return Response.json(
      { status: "ok" },
      { headers: { [requestIdHeader]: requestId } },
    );
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    writeServerLog("error", "health.completed", {
      requestId,
      durationMs,
      ok: false,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { [requestIdHeader]: requestId } },
    );
  }
}
