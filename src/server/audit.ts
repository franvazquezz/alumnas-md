import { type AuditAction, Prisma } from "@prisma/client";

type AuditClient = Pick<Prisma.TransactionClient, "auditLog">;

export const writeAudit = (
  db: AuditClient,
  event: {
    studioId: number;
    actorId: string;
    action: AuditAction;
    entityType:
      | "STUDIO"
      | "USER"
      | "MEMBERSHIP"
      | "SHIFT"
      | "STUDENT"
      | "CLASS";
    entityId?: string | number | null;
    metadata?: Record<string, string | number | boolean | null>;
  },
) =>
  db.auditLog.create({
    data: {
      studioId: event.studioId,
      actorId: event.actorId,
      action: event.action,
      entityType: event.entityType,
      entityId:
        event.entityId === null || event.entityId === undefined
          ? null
          : String(event.entityId),
      metadata: event.metadata ?? Prisma.JsonNull,
    },
  });
