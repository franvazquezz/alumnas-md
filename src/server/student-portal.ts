import "server-only";

import { redirect } from "next/navigation";

import { auth } from "~/auth";
import { canManageStudio } from "~/lib/auth/permissions";
import { db } from "~/server/db";

export const getStudentPortalData = async () => {
  const session = await auth();
  if (!session?.user.id) redirect("/login");

  if (session.user.role !== "STUDENT" || !session.user.studioId) {
    if (session.user.role && canManageStudio(session.user.role)) redirect("/");
    if (session.user.isPlatformAdmin) redirect("/admin");
    redirect("/mi-cuenta");
  }

  const [studio, student] = await Promise.all([
    db.studio.findUnique({
      where: { id: session.user.studioId },
      select: { id: true, name: true, description: true },
    }),
    db.student.findFirst({
      where: {
        userId: session.user.id,
        studioId: session.user.studioId,
      },
      include: {
        shift: { select: { startTime: true, label: true } },
        months: {
          orderBy: [{ year: "desc" }, { month: "desc" }],
          include: {
            classes: {
              orderBy: [
                { classDay: { sort: "desc", nulls: "last" } },
                { id: "desc" },
              ],
              include: {
                charges: { orderBy: [{ type: "asc" }, { id: "asc" }] },
              },
            },
          },
        },
      },
    }),
  ]);

  return { session, studio, student };
};
