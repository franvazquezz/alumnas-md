import { createHmac } from "node:crypto";
import { Prisma } from "@prisma/client";

import { db } from "~/server/db";

type RateLimitOptions = {
  scope: "login" | "register" | "password-reset" | "verification";
  identifiers: string[];
  maxAttempts: number;
  windowMs: number;
  blockMs: number;
};

const rateLimitSecret = () =>
  process.env.AUTH_SECRET ?? process.env.DATABASE_URL ?? "local-development";

const makeKey = (scope: string, identifiers: string[]) =>
  `${scope}:${createHmac("sha256", rateLimitSecret())
    .update(identifiers.join("\u0000"))
    .digest("hex")}`;

export async function consumeAuthRateLimit(
  options: RateLimitOptions,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const key = makeKey(options.scope, options.identifiers);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(
        async (tx) => {
          const now = new Date();
          const current = await tx.authRateLimit.findUnique({ where: { key } });

          if (current?.blockedUntil && current.blockedUntil > now) {
            return {
              allowed: false,
              retryAfterSeconds: Math.ceil(
                (current.blockedUntil.getTime() - now.getTime()) / 1000,
              ),
            };
          }

          const windowExpired =
            !current ||
            now.getTime() - current.windowStart.getTime() >= options.windowMs;
          const count = windowExpired ? 1 : current.count + 1;
          const blockedUntil =
            count > options.maxAttempts
              ? new Date(now.getTime() + options.blockMs)
              : null;

          await tx.authRateLimit.upsert({
            where: { key },
            create: { key, count, windowStart: now, blockedUntil },
            update: {
              count,
              windowStart: windowExpired ? now : current.windowStart,
              blockedUntil,
            },
          });

          return {
            allowed: blockedUntil === null,
            retryAfterSeconds: blockedUntil
              ? Math.ceil(options.blockMs / 1000)
              : 0,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2034" || error.code === "P2002") &&
        attempt < 2
      ) {
        continue;
      }
      throw error;
    }
  }

  return { allowed: false, retryAfterSeconds: 60 };
}

export async function clearAuthRateLimit(
  scope: RateLimitOptions["scope"],
  identifiers: string[],
) {
  await db.authRateLimit.deleteMany({
    where: { key: makeKey(scope, identifiers) },
  });
}

export const requestIp = (request: Request) =>
  request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
  request.headers.get("x-real-ip")?.trim() ??
  "unknown";
