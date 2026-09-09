import { type MembershipRole, type Prisma } from "@prisma/client";

import { db } from "~/server/db";
import { writeAudit } from "~/server/audit";
import { generateOpaqueToken, hashOpaqueToken, normalizeEmail } from "./tokens";

type Transaction = Prisma.TransactionClient;

export async function attachInvitation(
  tx: Transaction,
  invitation: {
    id: string;
    studioId: number;
    studentId: number | null;
    role: MembershipRole;
    invitedById?: string | null;
  },
  userId: string,
) {
  await tx.membership.create({
    data: {
      userId,
      studioId: invitation.studioId,
      role: invitation.role,
    },
  });

  await tx.user.updateMany({
    where: { id: userId, activeStudioId: null },
    data: { activeStudioId: invitation.studioId },
  });

  if (invitation.studentId !== null) {
    const result = await tx.student.updateMany({
      where: {
        id: invitation.studentId,
        studioId: invitation.studioId,
        userId: null,
      },
      data: { userId },
    });

    if (result.count !== 1) {
      throw new Error("La ficha de la invitación ya no está disponible");
    }
  }

  const accepted = await tx.invitation.updateMany({
    where: { id: invitation.id, status: "PENDING" },
    data: { status: "ACCEPTED", acceptedAt: new Date() },
  });

  if (accepted.count !== 1) {
    throw new Error("La invitación ya no está disponible");
  }

  await writeAudit(tx, {
    studioId: invitation.studioId,
    actorId: invitation.invitedById ?? userId,
    action: "ASSIGN",
    entityType: "MEMBERSHIP",
    entityId: userId,
    metadata: { role: invitation.role },
  });
}

export async function acceptPendingInvitationByEmail(
  userId: string,
  email: string,
) {
  const normalizedEmail = normalizeEmail(email);

  return db.$transaction(async (tx) => {
    const invitation = await tx.invitation.findFirst({
      where: {
        email: normalizedEmail,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!invitation) {
      throw new Error("No existe una invitación vigente para esta cuenta");
    }

    await attachInvitation(tx, invitation, userId);
    return invitation;
  });
}

export async function createInvitation(input: {
  email: string;
  studioId: number;
  role: MembershipRole;
  studentId?: number;
  invitedById?: string;
  expiresInHours?: number;
}) {
  const token = generateOpaqueToken();
  const email = normalizeEmail(input.email);
  const expiresAt = new Date(
    Date.now() + (input.expiresInHours ?? 48) * 60 * 60 * 1000,
  );

  const invitation = await db.invitation.create({
    data: {
      email,
      tokenHash: hashOpaqueToken(token),
      studioId: input.studioId,
      role: input.role,
      studentId: input.studentId,
      invitedById: input.invitedById,
      expiresAt,
    },
  });

  return { invitation, token };
}
