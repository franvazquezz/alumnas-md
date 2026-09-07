import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "~/auth";
import { db } from "~/server/db";

const deleteSchema = z.object({ sessionId: z.string().min(20).max(256) });

export async function GET() {
  const current = await auth();
  if (!current?.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sessions = await db.session.findMany({
    where: { userId: current.user.id, expires: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, sessionToken: true, createdAt: true, expires: true },
  });

  return NextResponse.json({
    sessions: sessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt,
      expires: session.expires,
      current: session.sessionToken === current.sessionId,
    })),
  });
}

export async function DELETE(request: Request) {
  const current = await auth();
  if (!current?.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 400 });
  }

  const target = await db.session.findFirst({
    where: {
      userId: current.user.id,
      id: parsed.data.sessionId,
    },
    select: { sessionToken: true },
  });
  if (!target) {
    return NextResponse.json(
      { error: "Sesión no encontrada" },
      { status: 404 },
    );
  }

  const deleted = await db.session.deleteMany({
    where: { userId: current.user.id, id: parsed.data.sessionId },
  });
  if (deleted.count !== 1) {
    return NextResponse.json(
      { error: "Sesión no encontrada" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    current: target.sessionToken === current.sessionId,
  });
}
