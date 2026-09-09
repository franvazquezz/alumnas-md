import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { writeAudit } from "~/server/audit";
import {
  adminProcedure,
  createTRPCRouter,
  ownerProcedure,
  platformProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import {
  userProfileInput,
  membershipInput,
  shiftCreateInput,
  shiftUpdateInput,
  studioCreateInput,
  studioUpdateInput,
} from "~/types/administration";
import { numericId } from "~/types/students";

const normalizeSlug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const nullableTrim = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed;
};

export const administrationRouter = createTRPCRouter({
  navigation: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db.membership.findMany({
      where: { userId: ctx.session.user.id, studio: { isActive: true } },
      include: { studio: true },
      orderBy: { studio: { name: "asc" } },
    });

    return {
      activeStudioId: ctx.session.user.studioId ?? null,
      isPlatformAdmin: ctx.session.user.isPlatformAdmin === true,
      studios: memberships.map(({ role, studio }) => ({
        id: studio.id,
        name: studio.name,
        slug: studio.slug,
        role,
      })),
    };
  }),

  switchStudio: protectedProcedure
    .input(z.object({ studioId: numericId }))
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.db.membership.findFirst({
        where: {
          userId: ctx.session.user.id,
          studioId: input.studioId,
          studio: { isActive: true },
        },
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN" });

      await ctx.db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: ctx.session.user.id },
          data: { activeStudioId: input.studioId },
        });
        await writeAudit(tx, {
          studioId: input.studioId,
          actorId: ctx.session.user.id,
          action: "SWITCH",
          entityType: "STUDIO",
          entityId: input.studioId,
        });
      });

      return { success: true };
    }),

  overview: adminProcedure.query(async ({ ctx }) => {
    const studioId = ctx.authorization.studioId;
    const [studio, classes, logs] = await Promise.all([
      ctx.db.studio.findUnique({
        where: { id: studioId },
        include: {
          shifts: { orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }] },
          _count: { select: { students: true, memberships: true } },
        },
      }),
      ctx.db.class.count({
        where: { month: { student: { studioId } } },
      }),
      ctx.db.auditLog.findMany({
        where: { studioId },
        include: { actor: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 80,
      }),
    ]);
    if (!studio) throw new TRPCError({ code: "NOT_FOUND" });

    return {
      studio,
      summary: {
        students: studio._count.students,
        classes,
        shifts: studio.shifts.filter((shift) => shift.isActive).length,
        users: studio._count.memberships,
      },
      logs,
    };
  }),

  updateCurrentStudio: ownerProcedure
    .input(studioUpdateInput.omit({ id: true, isActive: true }))
    .mutation(async ({ ctx, input }) => {
      const studioId = ctx.authorization.studioId;
      return ctx.db.$transaction(async (tx) => {
        const studio = await tx.studio.update({
          where: { id: studioId },
          data: {
            name: input.name.trim(),
            slug: normalizeSlug(input.slug),
            description: nullableTrim(input.description),
            address: nullableTrim(input.address),
            telephone: nullableTrim(input.telephone),
          },
        });
        await writeAudit(tx, {
          studioId,
          actorId: ctx.authorization.userId,
          action: "UPDATE",
          entityType: "STUDIO",
          entityId: studioId,
          metadata: { name: studio.name },
        });
        return studio;
      });
    }),

  createShift: ownerProcedure
    .input(shiftCreateInput)
    .mutation(async ({ ctx, input }) => {
      const studioId = ctx.authorization.studioId;
      return ctx.db.$transaction(async (tx) => {
        const shift = await tx.studioShift.create({
          data: {
            studioId,
            startTime: input.startTime,
            label: nullableTrim(input.label),
            sortOrder: input.sortOrder ?? 0,
          },
        });
        await writeAudit(tx, {
          studioId,
          actorId: ctx.authorization.userId,
          action: "CREATE",
          entityType: "SHIFT",
          entityId: shift.id,
          metadata: { startTime: shift.startTime },
        });
        return shift;
      });
    }),

  updateShift: ownerProcedure
    .input(shiftUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const studioId = ctx.authorization.studioId;
      const existing = await ctx.db.studioShift.findFirst({
        where: { id: input.id, studioId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.$transaction(async (tx) => {
        const shift = await tx.studioShift.update({
          where: { id: input.id },
          data: {
            startTime: input.startTime,
            label: nullableTrim(input.label),
            isActive: input.isActive,
            sortOrder: input.sortOrder,
          },
        });
        await writeAudit(tx, {
          studioId,
          actorId: ctx.authorization.userId,
          action: "UPDATE",
          entityType: "SHIFT",
          entityId: shift.id,
          metadata: {
            startTime: shift.startTime,
            isActive: shift.isActive,
          },
        });
        return shift;
      });
    }),

  deleteShift: ownerProcedure
    .input(z.object({ id: numericId }))
    .mutation(async ({ ctx, input }) => {
      const studioId = ctx.authorization.studioId;
      const shift = await ctx.db.studioShift.findFirst({
        where: { id: input.id, studioId },
        include: { _count: { select: { students: true } } },
      });
      if (!shift) throw new TRPCError({ code: "NOT_FOUND" });
      if (shift._count.students > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "El turno tiene alumnos asignados; desactívalo en lugar de eliminarlo.",
        });
      }

      await ctx.db.$transaction(async (tx) => {
        await tx.studioShift.delete({ where: { id: input.id } });
        await writeAudit(tx, {
          studioId,
          actorId: ctx.authorization.userId,
          action: "DELETE",
          entityType: "SHIFT",
          entityId: input.id,
          metadata: { startTime: shift.startTime },
        });
      });
      return { success: true };
    }),

  listStudios: platformProcedure.query(({ ctx }) =>
    ctx.db.studio.findMany({
      include: {
        _count: { select: { students: true, memberships: true, shifts: true } },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
  ),

  createStudio: platformProcedure
    .input(studioCreateInput)
    .mutation(async ({ ctx, input }) => {
      const slug = normalizeSlug(input.slug?.trim() ? input.slug : input.name);
      if (!slug) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Slug inválido" });
      }
      return ctx.db.$transaction(async (tx) => {
        const studio = await tx.studio.create({
          data: {
            name: input.name.trim(),
            slug,
            description: nullableTrim(input.description),
            address: nullableTrim(input.address),
            telephone: nullableTrim(input.telephone),
            shifts: {
              create: [
                { startTime: "10:00", sortOrder: 0 },
                { startTime: "16:00", sortOrder: 1 },
                { startTime: "18:30", sortOrder: 2 },
              ],
            },
            memberships: {
              create: { userId: ctx.session.user.id, role: "OWNER" },
            },
          },
        });
        await writeAudit(tx, {
          studioId: studio.id,
          actorId: ctx.session.user.id,
          action: "CREATE",
          entityType: "STUDIO",
          entityId: studio.id,
          metadata: { name: studio.name },
        });
        return studio;
      });
    }),

  updateStudio: platformProcedure
    .input(studioUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const studio = await ctx.db.studio.findUnique({
        where: { id: input.id },
      });
      if (!studio) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.studio.update({
          where: { id: input.id },
          data: {
            name: input.name.trim(),
            slug: normalizeSlug(input.slug),
            description: nullableTrim(input.description),
            address: nullableTrim(input.address),
            telephone: nullableTrim(input.telephone),
            isActive: input.isActive,
          },
        });
        await writeAudit(tx, {
          studioId: input.id,
          actorId: ctx.session.user.id,
          action: "UPDATE",
          entityType: "STUDIO",
          entityId: input.id,
          metadata: { name: updated.name, isActive: updated.isActive },
        });
        return updated;
      });
    }),

  listUsers: platformProcedure.query(({ ctx }) =>
    ctx.db.user.findMany({
      include: {
        memberships: {
          include: { studio: { select: { id: true, name: true } } },
          orderBy: { studio: { name: "asc" } },
        },
        students: { select: { id: true, name: true, studioId: true } },
      },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    }),
  ),

  listStudents: platformProcedure.query(({ ctx }) =>
    ctx.db.student.findMany({
      select: { id: true, name: true, studioId: true, userId: true },
      orderBy: { name: "asc" },
    }),
  ),

  updateUser: platformProcedure
    .input(userProfileInput)
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.db.user.findUnique({
        where: { id: input.userId },
      });
      if (!current) throw new TRPCError({ code: "NOT_FOUND" });
      if (current.isPlatformAdmin && !input.isPlatformAdmin) {
        const admins = await ctx.db.user.count({
          where: { isPlatformAdmin: true },
        });
        if (admins <= 1) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Debe quedar al menos un administrador de plataforma.",
          });
        }
      }
      return ctx.db.user.update({
        where: { id: input.userId },
        data: {
          name: nullableTrim(input.name),
          isPlatformAdmin: input.isPlatformAdmin,
        },
      });
    }),

  setMembership: platformProcedure
    .input(membershipInput)
    .mutation(async ({ ctx, input }) => {
      const [user, studio] = await Promise.all([
        ctx.db.user.findUnique({ where: { id: input.userId } }),
        ctx.db.studio.findUnique({ where: { id: input.studioId } }),
      ]);
      if (!user || !studio) throw new TRPCError({ code: "NOT_FOUND" });

      const currentMembership = await ctx.db.membership.findUnique({
        where: {
          userId_studioId: {
            userId: input.userId,
            studioId: input.studioId,
          },
        },
      });
      if (currentMembership?.role === "OWNER" && input.role !== "OWNER") {
        const owners = await ctx.db.membership.count({
          where: { studioId: input.studioId, role: "OWNER" },
        });
        if (owners <= 1) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Asigna otro propietario antes de cambiar este rol.",
          });
        }
      }

      const student =
        input.role === "STUDENT" && input.studentId
          ? await ctx.db.student.findFirst({
              where: { id: input.studentId, studioId: input.studioId },
            })
          : null;
      if (input.role === "STUDENT" && !student) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Selecciona la ficha del alumno para ese taller.",
        });
      }
      if (student?.userId && student.userId !== input.userId) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "La ficha ya está vinculada.",
        });
      }

      return ctx.db.$transaction(async (tx) => {
        const membership = await tx.membership.upsert({
          where: {
            userId_studioId: { userId: input.userId, studioId: input.studioId },
          },
          create: {
            userId: input.userId,
            studioId: input.studioId,
            role: input.role,
          },
          update: { role: input.role },
        });
        await tx.student.updateMany({
          where: {
            studioId: input.studioId,
            userId: input.userId,
            ...(student ? { id: { not: student.id } } : {}),
          },
          data: { userId: null },
        });
        if (student) {
          await tx.student.update({
            where: { id: student.id },
            data: { userId: input.userId },
          });
        }
        if (user.activeStudioId === null) {
          await tx.user.update({
            where: { id: input.userId },
            data: { activeStudioId: input.studioId },
          });
        }
        await writeAudit(tx, {
          studioId: input.studioId,
          actorId: ctx.session.user.id,
          action: "ASSIGN",
          entityType: "MEMBERSHIP",
          entityId: membership.id,
          metadata: { email: user.email, role: input.role },
        });
        return membership;
      });
    }),

  removeMembership: platformProcedure
    .input(z.object({ userId: z.string().min(1), studioId: numericId }))
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.db.membership.findUnique({
        where: { userId_studioId: input },
        include: { user: true },
      });
      if (!membership) throw new TRPCError({ code: "NOT_FOUND" });
      if (membership.role === "OWNER") {
        const owners = await ctx.db.membership.count({
          where: { studioId: input.studioId, role: "OWNER" },
        });
        if (owners <= 1) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "El taller debe conservar al menos un propietario.",
          });
        }
      }

      await ctx.db.$transaction(async (tx) => {
        await tx.student.updateMany({
          where: { studioId: input.studioId, userId: input.userId },
          data: { userId: null },
        });
        await tx.membership.delete({ where: { id: membership.id } });
        if (membership.user.activeStudioId === input.studioId) {
          const fallback = await tx.membership.findFirst({
            where: { userId: input.userId, studio: { isActive: true } },
            orderBy: { createdAt: "asc" },
          });
          await tx.user.update({
            where: { id: input.userId },
            data: { activeStudioId: fallback?.studioId ?? null },
          });
        }
        await writeAudit(tx, {
          studioId: input.studioId,
          actorId: ctx.session.user.id,
          action: "UNASSIGN",
          entityType: "MEMBERSHIP",
          entityId: membership.id,
          metadata: { email: membership.user.email, role: membership.role },
        });
      });
      return { success: true };
    }),

  availableStudents: platformProcedure
    .input(z.object({ studioId: numericId }))
    .query(({ ctx, input }) =>
      ctx.db.student.findMany({
        where: { studioId: input.studioId },
        select: { id: true, name: true, userId: true },
        orderBy: { name: "asc" },
      }),
    ),
});
