import { Prisma, type PaymentStatus, type Weekday } from "@prisma/client";
import { TRPCError } from "@trpc/server";

import {
  calendarDateFromDatabase,
  calendarDateToDatabase,
} from "~/lib/domain/calendar-date";
import { canReadStudent } from "~/lib/auth/permissions";
import { calculateFinancialSummary } from "~/lib/domain/money";
import {
  adminProcedure,
  createTRPCRouter,
  studioProcedure,
} from "~/server/api/trpc";
import {
  deleteClassInput,
  monthInput,
  newClassInput,
  studentCreateInput,
  studentIdInput,
  studentSearchInput,
  studentUpdateInput,
  updateClassInput,
} from "~/types/students";
import type { StudentWithMonths } from "~/types/students";
import { formatMonth } from "~/types/utils";
import { writeAudit } from "~/server/audit";

const WEEKDAY_ORDER: Weekday[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const getDayRank = (value?: Weekday | null) => {
  const index = value ? WEEKDAY_ORDER.indexOf(value) : -1;
  return index === -1 ? Number.POSITIVE_INFINITY : index;
};

const getTimetableRank = (value?: string | null) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const [hours = 0, minutes = 0] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const dateUpdate = (value: string | null | undefined) => {
  if (value === undefined) return undefined;
  return value === null ? null : calendarDateToDatabase(value);
};

const mapClass = <
  T extends StudentWithMonths["months"][number]["classes"][number],
>(
  cls: T,
) => {
  const { charges, ...rest } = cls;
  return {
    ...rest,
    classDay: calendarDateFromDatabase(cls.classDay),
    classPrice: cls.classPrice.toFixed(2),
    ovenPrice: cls.ovenPrice.toFixed(2),
    materialPrice: cls.materialPrice.toFixed(2),
    charges: charges.map((charge) => ({
      ...charge,
      price: charge.price.toFixed(2),
    })),
  };
};

const mapStudent = (student: StudentWithMonths) => {
  const months = student.months.map((month) => ({
    id: month.id,
    year: month.year,
    month: month.month,
    label: formatMonth(month.year, month.month),
    createdAt: month.createdAt,
    updatedAt: month.updatedAt,
    studentId: month.studentId,
    classes: month.classes.map(mapClass),
  }));

  const classes = months.flatMap((month) =>
    month.classes.map((cls) => ({
      ...cls,
      monthLabel: month.label,
    })),
  );

  const financialSummary = calculateFinancialSummary(
    classes.flatMap((cls) => [
      { amount: cls.classPrice, status: cls.classPaymentStatus },
      { amount: cls.ovenPrice, status: cls.ovenPaymentStatus },
      { amount: cls.materialPrice, status: cls.materialPaymentStatus },
      ...cls.charges.map((charge) => ({
        amount: charge.price,
        status: charge.paymentStatus,
      })),
    ]),
  );

  return {
    id: student.id,
    name: student.name,
    birthday: calendarDateFromDatabase(student.birthday),
    telephone: student.telephone,
    weekday: student.weekday,
    shiftId: student.shiftId,
    timetable: student.shift?.startTime ?? null,
    isActive: student.isActive,
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
    months,
    classes,
    financialSummary,
  };
};

const studentRelations = {
  shift: true,
  months: {
    orderBy: [{ year: "desc" as const }, { month: "desc" as const }],
    include: {
      classes: {
        orderBy: [
          { classDay: { sort: "asc" as const, nulls: "last" as const } },
          { id: "asc" as const },
        ],
        include: {
          charges: {
            orderBy: [{ type: "asc" as const }, { id: "asc" as const }],
          },
        },
      },
    },
  },
};

export const studentsRouter = createTRPCRouter({
  formOptions: adminProcedure.query(({ ctx }) =>
    ctx.db.studioShift.findMany({
      where: { studioId: ctx.authorization.studioId },
      orderBy: [
        { isActive: "desc" },
        { sortOrder: "asc" },
        { startTime: "asc" },
      ],
      select: { id: true, startTime: true, label: true, isActive: true },
    }),
  ),

  list: adminProcedure
    .input(studentSearchInput)
    .query(async ({ ctx, input }) => {
      const students = await ctx.db.student.findMany({
        where: {
          studioId: ctx.authorization.studioId,
          ...(input?.search
            ? {
                name: {
                  contains: input.search,
                  mode: "insensitive" as const,
                },
              }
            : {}),
        },
        include: studentRelations,
      });

      return students.map(mapStudent).sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        const dayDiff = getDayRank(a.weekday) - getDayRank(b.weekday);
        if (dayDiff !== 0) return dayDiff;
        const timeDiff =
          getTimetableRank(a.timetable) - getTimetableRank(b.timetable);
        if (timeDiff !== 0) return timeDiff;
        return a.name.localeCompare(b.name);
      });
    }),

  byId: studioProcedure.input(studentIdInput).query(async ({ ctx, input }) => {
    const student = await ctx.db.student.findFirst({
      where: { id: input.id, studioId: ctx.authorization.studioId },
      include: studentRelations,
    });

    if (!student) return null;
    if (!canReadStudent(ctx.authorization, student)) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return mapStudent(student);
  }),

  mine: studioProcedure.query(async ({ ctx }) => {
    const student = await ctx.db.student.findFirst({
      where: {
        studioId: ctx.authorization.studioId,
        userId: ctx.authorization.userId,
      },
      include: studentRelations,
    });

    return student ? mapStudent(student) : null;
  }),

  create: adminProcedure
    .input(studentCreateInput)
    .mutation(async ({ ctx, input }) => {
      const trimmedName = input.name.trim();
      const name = trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1);
      if (input.shiftId) {
        const shift = await ctx.db.studioShift.findFirst({
          where: { id: input.shiftId, studioId: ctx.authorization.studioId },
        });
        if (!shift) throw new TRPCError({ code: "BAD_REQUEST" });
      }
      return ctx.db.$transaction(async (tx) => {
        const student = await tx.student.create({
          data: {
            name,
            birthday: input.birthday
              ? calendarDateToDatabase(input.birthday)
              : null,
            telephone: input.telephone?.trim() ?? null,
            weekday: (input.weekday as Weekday | null | undefined) ?? null,
            shiftId: input.shiftId ?? null,
            isActive: input.isActive ?? true,
            studioId: ctx.authorization.studioId,
          },
          include: studentRelations,
        });
        await writeAudit(tx, {
          studioId: ctx.authorization.studioId,
          actorId: ctx.authorization.userId,
          action: "CREATE",
          entityType: "STUDENT",
          entityId: student.id,
          metadata: { name: student.name },
        });
        return mapStudent(student);
      });
    }),

  update: adminProcedure
    .input(studentUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const existing = await ctx.db.student.findFirst({
        where: { id, studioId: ctx.authorization.studioId },
        select: { id: true },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      if (rest.shiftId) {
        const shift = await ctx.db.studioShift.findFirst({
          where: { id: rest.shiftId, studioId: ctx.authorization.studioId },
        });
        if (!shift) throw new TRPCError({ code: "BAD_REQUEST" });
      }

      const trimmedName = rest.name?.trim();
      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.student.update({
          where: { id },
          data: {
            name: trimmedName
              ? trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1)
              : undefined,
            birthday: dateUpdate(rest.birthday),
            telephone:
              rest.telephone === undefined ? undefined : rest.telephone || null,
            weekday:
              rest.weekday === undefined
                ? undefined
                : (rest.weekday as Weekday | null),
            shiftId: rest.shiftId,
            isActive: rest.isActive,
          },
          include: studentRelations,
        });
        await writeAudit(tx, {
          studioId: ctx.authorization.studioId,
          actorId: ctx.authorization.userId,
          action: "UPDATE",
          entityType: "STUDENT",
          entityId: id,
          metadata: { name: updated.name },
        });
        return mapStudent(updated);
      });
    }),

  delete: adminProcedure
    .input(studentIdInput)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.student.findFirst({
        where: { id: input.id, studioId: ctx.authorization.studioId },
        select: { id: true },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db.$transaction(async (tx) => {
        await tx.class.deleteMany({
          where: { month: { studentId: input.id } },
        });
        await tx.month.deleteMany({ where: { studentId: input.id } });
        await tx.student.delete({ where: { id: input.id } });
        await writeAudit(tx, {
          studioId: ctx.authorization.studioId,
          actorId: ctx.authorization.userId,
          action: "DELETE",
          entityType: "STUDENT",
          entityId: input.id,
        });
      });
      return { success: true };
    }),

  addMonth: adminProcedure
    .input(monthInput)
    .mutation(async ({ ctx, input }) => {
      const studentExists = await ctx.db.student.findFirst({
        where: {
          id: input.studentId,
          studioId: ctx.authorization.studioId,
        },
        select: { id: true },
      });
      if (!studentExists) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.month.create({
        data: {
          year: input.year,
          month: input.month,
          studentId: input.studentId,
        },
      });
    }),

  addClass: adminProcedure
    .input(newClassInput)
    .mutation(async ({ ctx, input }) => {
      const month = await ctx.db.month.findFirst({
        where: {
          id: input.monthId,
          studentId: input.studentId,
          student: { studioId: ctx.authorization.studioId },
        },
        select: { id: true },
      });
      if (!month) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.$transaction(async (tx) => {
        const created = await tx.class.create({
          data: {
            className: input.className.trim(),
            assistance: input.assistance ?? false,
            classPrice: new Prisma.Decimal(input.classPrice),
            classDay: dateUpdate(input.classDay),
            classPaymentStatus: (input.classPaymentStatus ??
              "PENDING") as PaymentStatus,
            ovenName: input.ovenName?.trim() ?? null,
            ovenPrice: new Prisma.Decimal(input.ovenPrice ?? "0.00"),
            ovenPaymentStatus: (input.ovenPaymentStatus ??
              "PENDING") as PaymentStatus,
            materialName: input.materialName?.trim() ?? null,
            materialPrice: new Prisma.Decimal(input.materialPrice ?? "0.00"),
            materialPaymentStatus: (input.materialPaymentStatus ??
              "PENDING") as PaymentStatus,
            monthId: input.monthId,
          },
        });
        await writeAudit(tx, {
          studioId: ctx.authorization.studioId,
          actorId: ctx.authorization.userId,
          action: "CREATE",
          entityType: "CLASS",
          entityId: created.id,
          metadata: {
            className: created.className,
            studentId: input.studentId,
          },
        });
        const student = await tx.student.findUnique({
          where: { id: input.studentId },
          include: studentRelations,
        });
        return student ? mapStudent(student) : null;
      });
    }),

  updateClass: adminProcedure
    .input(updateClassInput)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.class.findFirst({
        where: {
          id: input.classId,
          month: { student: { studioId: ctx.authorization.studioId } },
        },
        select: { id: true },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.class.update({
          where: { id: input.classId },
          data: {
            className: input.className.trim(),
            assistance: input.assistance,
            classPrice: new Prisma.Decimal(input.classPrice),
            classDay: dateUpdate(input.classDay),
            classPaymentStatus: input.classPaymentStatus as
              | PaymentStatus
              | undefined,
            ovenName:
              input.ovenName === undefined
                ? undefined
                : input.ovenName.trim() || null,
            ovenPrice:
              input.ovenPrice === undefined
                ? undefined
                : new Prisma.Decimal(input.ovenPrice),
            ovenPaymentStatus: input.ovenPaymentStatus as
              | PaymentStatus
              | undefined,
            materialName:
              input.materialName === undefined
                ? undefined
                : input.materialName.trim() || null,
            materialPrice:
              input.materialPrice === undefined
                ? undefined
                : new Prisma.Decimal(input.materialPrice),
            materialPaymentStatus: input.materialPaymentStatus as
              | PaymentStatus
              | undefined,
          },
          include: { charges: true },
        });
        await writeAudit(tx, {
          studioId: ctx.authorization.studioId,
          actorId: ctx.authorization.userId,
          action: "UPDATE",
          entityType: "CLASS",
          entityId: updated.id,
          metadata: { className: updated.className },
        });
        return mapClass(updated);
      });
    }),

  deleteClass: adminProcedure
    .input(deleteClassInput)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.class.findFirst({
        where: {
          id: input.classId,
          month: { student: { studioId: ctx.authorization.studioId } },
        },
        select: { id: true, className: true },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.$transaction(async (tx) => {
        await tx.class.delete({ where: { id: input.classId } });
        await writeAudit(tx, {
          studioId: ctx.authorization.studioId,
          actorId: ctx.authorization.userId,
          action: "DELETE",
          entityType: "CLASS",
          entityId: input.classId,
          metadata: { className: existing.className },
        });
      });
      return { success: true };
    }),

  classes: adminProcedure.query(async ({ ctx }) => {
    const classes = await ctx.db.class.findMany({
      where: {
        month: { student: { studioId: ctx.authorization.studioId } },
      },
      include: {
        charges: true,
        month: { include: { student: true } },
      },
      orderBy: [{ classDay: { sort: "desc", nulls: "last" } }, { id: "desc" }],
    });

    return classes.map((cls) => ({
      ...mapClass(cls),
      monthLabel: formatMonth(cls.month.year, cls.month.month),
      studentId: cls.month.studentId,
      studentName: cls.month.student.name,
    }));
  }),
});
