import type { MembershipRole } from "@prisma/client";

export type AuthorizationContext = {
  userId: string;
  role: MembershipRole;
  studioId: number;
};

export type StudentResource = {
  studioId: number;
  userId: string | null;
};

export const canManageStudio = (role: MembershipRole) =>
  role === "OWNER" || role === "ADMIN";

export const canReadStudent = (
  authorization: AuthorizationContext,
  student: StudentResource,
) =>
  authorization.studioId === student.studioId &&
  (canManageStudio(authorization.role) ||
    (authorization.role === "STUDENT" &&
      student.userId === authorization.userId));
