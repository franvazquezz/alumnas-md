import { NextResponse } from "next/server";
import { z } from "zod";

import { hashPassword } from "~/lib/auth/password";
import { consumeAuthRateLimit, requestIp } from "~/lib/auth/rate-limit";
import { consumeUserToken } from "~/lib/auth/user-tokens";
import { db } from "~/server/db";

const schema = z.object({
  token: z.string().min(32).max(256),
  password: z.string().min(12).max(128),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "El enlace o la contraseña no son válidos." },
      { status: 400 },
    );
  }

  const limit = await consumeAuthRateLimit({
    scope: "password-reset",
    identifiers: [requestIp(request), parsed.data.token],
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
    blockMs: 30 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Vuelve a probar más tarde." },
      { status: 429 },
    );
  }

  const token = await consumeUserToken(parsed.data.token, "PASSWORD_RESET");
  if (!token) {
    return NextResponse.json(
      { error: "El enlace no es válido o ya venció." },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.$transaction([
    db.passwordCredential.update({
      where: { userId: token.userId },
      data: { passwordHash },
    }),
    db.session.deleteMany({ where: { userId: token.userId } }),
    db.authToken.updateMany({
      where: {
        userId: token.userId,
        type: "PASSWORD_RESET",
        consumedAt: null,
      },
      data: { consumedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
