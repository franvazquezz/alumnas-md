import {
  Prisma,
  type PaymentStatus,
  type Timetable,
  type Weekday,
} from "@prisma/client";

import {
  calendarDateFromDatabase,
  calendarDateToDatabase,
} from "~/lib/domain/calendar-date";
import { calculateFinancialSummary } from "~/lib/domain/money";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
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

const TIMETABLE_MAP: Record<string, "10:00" | "16:00" | "18:30"> = {
  TEN: "10:00",
  SIXTEEN: "16:00",
  EIGHTEEN: "18:30",
  "10:00": "10:00",
  "16:00": "16:00",
  "18:30": "18:30",
};

const TIMETABLE_REVERSE_MAP = {
  "10:00": "TEN",
  "16:00": "SIXTEEN",
  "18:30": "EIGHTEEN",
} as const;

const WEEKDAY_ORDER: Weekday[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const TIMETABLE_ORDER = ["10:00", "16:00", "18:30"];

const timetableNameToValue = (name?: Timetable | null) =>
  name ? (TIMETABLE_MAP[String(name)] ?? null) : null;

const timetableValueToName = (value?: "10:00" | "16:00" | "18:30" | null) =>
  value ? (TIMETABLE_REVERSE_MAP[value] as Timetable) : null;

const getDayRank = (value?: Weekday | null) => {
  const index = value ? WEEKDAY_ORDER.indexOf(value) : -1;
  return index === -1 ? Number.POSITIVE_INFINITY : index;
};

const getTimetableRank = (value?: string | null) => {
  const index = value ? TIMETABLE_ORDER.indexOf(value) : -1;
  return index === -1 ? Number.POSITIVE_INFINITY : index;
};

const dateUpdate = (value: string | null | undefined) => {
  if (value === undefined) return undefined;
  return value === null ? null : calendarDateToDatabase(value);
};

const mapClass = <
  T extends StudentWithMonths["months"][number]["classes"][number],
>(
  cls: T,
) => ({
  ...cls,
  classDay: calendarDateFromDatabase(cls.classDay),
  classPrice: cls.classPrice.toFixed(2),
  ovenPrice: cls.ovenPrice.toFixed(2),
  materialPrice: cls.materialPrice.toFixed(2),
});

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
    ]),
  );

  return {
    id: student.id,
    name: student.name,
    birthday: calendarDateFromDatabase(student.birthday),
    telephone: student.telephone,
    weekday: student.weekday,
    timetable: timetableNameToValue(student.timetable),
    isActive: student.isActive,
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
    months,
    classes,
    financialSummary,
  };
};

const studentRelations = {
  months: {
    orderBy: [{ year: "desc" as const }, { month: "desc" as const }],
    include: {
      classes: {
        orderBy: [
          { classDay: { sort: "asc" as const, nulls: "last" as const } },
          { id: "asc" as const },
        ],
      },
    },
  },
};

export const studentsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(studentSearchInput)
    .query(async ({ ctx, input }) => {
      const students = await ctx.db.student.findMany({
        where: input?.search
          ? {
              name: {
                contains: input.search,
                mode: "insensitive",
              },
            }
          : undefined,
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

  byId: protectedProcedure
    .input(studentIdInput)
    .query(async ({ ctx, input }) => {
      const student = await ctx.db.student.findUnique({
        where: { id: input.id },
        include: studentRelations,
      });

      return student ? mapStudent(student) : null;
    }),

  create: protectedProcedure
    .input(studentCreateInput)
    .mutation(async ({ ctx, input }) => {
      const trimmedName = input.name.trim();
      const name = trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1);
      const student = await ctx.db.student.create({
        data: {
          name,
          birthday: input.birthday
            ? calendarDateToDatabase(input.birthday)
            : null,
          telephone: input.telephone?.trim() ?? null,
          weekday: (input.weekday as Weekday | null | undefined) ?? null,
          timetable: timetableValueToName(input.timetable),
          isActive: input.isActive ?? true,
        },
        include: studentRelations,
      });
      return mapStudent(student);
    }),

  update: protectedProcedure
    .input(studentUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const trimmedName = rest.name?.trim();
      const updated = await ctx.db.student.update({
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
          timetable:
            rest.timetable === undefined
              ? undefined
              : timetableValueToName(rest.timetable),
          isActive: rest.isActive,
        },
        include: studentRelations,
      });
      return mapStudent(updated);
    }),

  delete: protectedProcedure
    .input(studentIdInput)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction([
        ctx.db.class.deleteMany({ where: { month: { studentId: input.id } } }),
        ctx.db.month.deleteMany({ where: { studentId: input.id } }),
        ctx.db.student.delete({ where: { id: input.id } }),
      ]);
      return { success: true };
    }),

  addMonth: protectedProcedure
    .input(monthInput)
    .mutation(async ({ ctx, input }) => {
      const studentExists = await ctx.db.student.findUnique({
        where: { id: input.studentId },
        select: { id: true },
      });
      if (!studentExists) throw new Error("Student not found");

      return ctx.db.month.create({
        data: {
          year: input.year,
          month: input.month,
          studentId: input.studentId,
        },
      });
    }),

  addClass: protectedProcedure
    .input(newClassInput)
    .mutation(async ({ ctx, input }) => {
      const month = await ctx.db.month.findFirst({
        where: { id: input.monthId, studentId: input.studentId },
        select: { id: true },
      });
      if (!month) throw new Error("Month not found for student");

      await ctx.db.class.create({
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

      const student = await ctx.db.student.findUnique({
        where: { id: input.studentId },
        include: studentRelations,
      });

      return student ? mapStudent(student) : null;
    }),

  updateClass: protectedProcedure
    .input(updateClassInput)
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db.class.update({
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
      });
      return mapClass(updated);
    }),

  deleteClass: protectedProcedure
    .input(deleteClassInput)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.class.delete({ where: { id: input.classId } });
      return { success: true };
    }),

  classes: protectedProcedure.query(async ({ ctx }) => {
    const classes = await ctx.db.class.findMany({
      include: { month: { include: { student: true } } },
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
