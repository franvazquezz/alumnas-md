import { NextResponse } from "next/server";
import { z } from "zod";

import { sendAuthEmail } from "~/lib/auth/email";
import { consumeAuthRateLimit, requestIp } from "~/lib/auth/rate-limit";
import { normalizeEmail } from "~/lib/auth/tokens";
import { createUserToken } from "~/lib/auth/user-tokens";
import { db } from "~/server/db";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: true });

  const email = normalizeEmail(parsed.data.email);
  const limit = await consumeAuthRateLimit({
    scope: "password-reset",
    identifiers: [requestIp(request), email],
    maxAttempts: 3,
    windowMs: 30 * 60 * 1000,
    blockMs: 30 * 60 * 1000,
  });
  if (!limit.allowed) return NextResponse.json({ ok: true });

  const user = await db.user.findUnique({
    where: { email },
    include: { passwordCredential: true },
  });
  if (user?.passwordCredential) {
    const token = await createUserToken(
      user.id,
      "PASSWORD_RESET",
      30 * 60 * 1000,
    );
    const url = new URL(`/reset-password/${token}`, request.url);
    try {
      await sendAuthEmail({
        to: user.email,
        subject: "Restablece tu contraseña de MD Cerámica",
        heading: "Restablecer contraseña",
        message: "El enlace vence en 30 minutos y sólo se puede usar una vez.",
        actionLabel: "Elegir nueva contraseña",
        actionUrl: url.toString(),
      });
    } catch (error) {
      console.error("Could not send password reset email", error);
    }
  }

  return NextResponse.json({ ok: true });
}
