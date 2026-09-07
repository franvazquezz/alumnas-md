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
  if (!parsed.success) {
    return NextResponse.json({ ok: true });
  }

  const email = normalizeEmail(parsed.data.email);
  const limit = await consumeAuthRateLimit({
    scope: "verification",
    identifiers: [requestIp(request), email],
    maxAttempts: 3,
    windowMs: 30 * 60 * 1000,
    blockMs: 30 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json({ ok: true });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (user && !user.emailVerified) {
    const token = await createUserToken(
      user.id,
      "EMAIL_VERIFICATION",
      60 * 60 * 1000,
    );
    const url = new URL("/api/account/verify-email", request.url);
    url.searchParams.set("token", token);
    try {
      await sendAuthEmail({
        to: user.email,
        subject: "Verifica tu cuenta de MD Cerámica",
        heading: "Confirma tu correo",
        message: "Usa este enlace para confirmar tu dirección de correo.",
        actionLabel: "Verificar correo",
        actionUrl: url.toString(),
      });
    } catch (error) {
      console.error("Could not resend verification email", error);
    }
  }

  return NextResponse.json({ ok: true });
}
