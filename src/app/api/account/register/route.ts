import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { sendAuthEmail } from "~/lib/auth/email";
import { attachInvitation } from "~/lib/auth/invitations";
import { hashPassword } from "~/lib/auth/password";
import { consumeAuthRateLimit, requestIp } from "~/lib/auth/rate-limit";
import { hashOpaqueToken, normalizeEmail } from "~/lib/auth/tokens";
import { createUserToken } from "~/lib/auth/user-tokens";
import { db } from "~/server/db";

const inputSchema = z.object({
  token: z.string().min(32).max(256),
  name: z.string().trim().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(12).max(128),
});

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Revisa los datos. La contraseña debe tener al menos 12 caracteres.",
      },
      { status: 400 },
    );
  }

  const email = normalizeEmail(parsed.data.email);
  const ip = requestIp(request);
  const limit = await consumeAuthRateLimit({
    scope: "register",
    identifiers: [ip, email],
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
    blockMs: 30 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Vuelve a probar más tarde." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);

  try {
    const user = await db.$transaction(
      async (tx) => {
        const invitation = await tx.invitation.findUnique({
          where: { tokenHash: hashOpaqueToken(parsed.data.token) },
        });

        if (!invitation) throw new Error("INVALID_INVITATION");

        if (
          invitation.status !== "PENDING" ||
          invitation.expiresAt <= new Date() ||
          invitation.email !== email
        ) {
          throw new Error("INVALID_INVITATION");
        }

        const created = await tx.user.create({
          data: {
            email,
            name: parsed.data.name,
            passwordCredential: { create: { passwordHash } },
          },
        });
        await attachInvitation(tx, invitation, created.id);
        return created;
      },
      { isolationLevel: "Serializable" },
    );

    const verificationToken = await createUserToken(
      user.id,
      "EMAIL_VERIFICATION",
      60 * 60 * 1000,
    );
    const verificationUrl = new URL("/api/account/verify-email", request.url);
    verificationUrl.searchParams.set("token", verificationToken);

    let emailSent = true;
    try {
      await sendAuthEmail({
        to: user.email,
        subject: "Verifica tu cuenta de MD Cerámica",
        heading: "Confirma tu correo",
        message:
          "Tu cuenta fue creada. Confirma el correo para poder iniciar sesión.",
        actionLabel: "Verificar correo",
        actionUrl: verificationUrl.toString(),
      });
    } catch (error) {
      emailSent = false;
      console.error("Could not send verification email", error);
    }

    return NextResponse.json({ ok: true, emailSent }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "INVALID_INVITATION" ||
        error.message.includes("La ficha de la invitación") ||
        error.message.includes("La invitación ya no"))
    ) {
      return NextResponse.json(
        {
          error:
            "La invitación no es válida, venció o no corresponde a ese correo.",
        },
        { status: 400 },
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "No se pudo usar esta invitación." },
        { status: 409 },
      );
    }

    throw error;
  }
}
