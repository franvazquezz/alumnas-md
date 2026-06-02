import { Prisma } from "@prisma/client";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  deleteClassInput,
  markAttendanceInput,
  monthInput,
  newClassInput,
  prepareMonthInput,
  studentCreateInput,
  studentIdInput,
  studentSearchInput,
  studentUpdateInput,
  updateClassInput,
  useMakeupInput,
  yearMonthInput,
} from "~/types/students";
import type { StudentWithMonths } from "~/types/students";

// Map between Prisma enum names and the readable timetable strings used by
// the frontend and zod validation. Prisma enum values are defined in
// prisma/schema.prisma as: TEN @map("10:00"), SIXTEEN @map("16:00"),
// EIGHTEEN @map("18:30"). The Prisma client will expose the enum *names*
// (TEN, SIXTEEN, EIGHTEEN) in JS, so we translate back and forth.
const TIMETABLE_MAP: Record<string, string> = {
  TEN: "10:00",
  SIXTEEN: "16:00",
  EIGHTEEN: "18:30",
};

const timetableNameToValue = (name?: string | null) => {
  if (!name) return undefined;
  return TIMETABLE_MAP[name] ?? undefined;
};

const timetableValueToName = (value?: string | null) => {
  if (!value) return undefined;
  const entry = Object.entries(TIMETABLE_MAP).find(([, v]) => v === value);
  return entry ? entry[0] : undefined;
};

const DAY_ORDER = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
];

const TIMETABLE_ORDER = ["10:00", "16:00", "18:30"];

const normalizeDay = (value?: string | null) =>
  value
    ? value
        .trim()
        .toLowerCase()
        .replace(/á/g, "a")
        .replace(/é/g, "e")
        .replace(/í/g, "i")
        .replace(/ó/g, "o")
        .replace(/ú/g, "u")
    : "";

const getDayRank = (value?: string | null) => {
  const index = DAY_ORDER.indexOf(normalizeDay(value));
  return index === -1 ? Number.POSITIVE_INFINITY : index;
};

const getTimetableRank = (value?: string | null) => {
  const index = value ? TIMETABLE_ORDER.indexOf(value) : -1;
  return index === -1 ? Number.POSITIVE_INFINITY : index;
};

const createAttendanceSlotSeeds = (includedClasses: number) =>
  Array.from({ length: includedClasses }, (_, index) => ({
    slotNumber: index + 1,
  }));

const mapStudent = (student: StudentWithMonths) => {
  const months = student.months.map((month) => ({
    id: month.id,
    label: month.label,
    createdAt: month.createdAt,
    updatedAt: month.updatedAt,
    studentId: month.studentId,
    classes: month.classes.map((cls) => ({
      ...cls,
      assistance: cls.assistance.some(Boolean),
    })),
  }));

  const monthClasses = months.flatMap((month) =>
    month.classes.map((cls) => ({
      ...cls,
      monthLabel: month.label,
    })),
  );
  const legacyClasses =
    student.studentClasses?.map(({ class: cls }) => ({
      ...cls,
      assistance: cls.assistance.some(Boolean),
      monthId: cls.monthId ?? "",
      monthLabel: "Histórico",
    })) ?? [];

  return {
    id: student.id,
    name: student.name,
    birthday: student.birthday,
    telephone: student.telephone,
    day: student.day,
    // Prisma returns the enum name (e.g. EIGHTEEN). Convert to the
    // user-facing mapped value (e.g. "18:30") before sending to client.
    timetable: timetableNameToValue(student.timetable) ?? student.timetable,
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
    months,
    classes: [...monthClasses, ...legacyClasses],
  };
};

export const studentsRouter = createTRPCRouter({
  list: publicProcedure
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
        include: {
          months: { include: { classes: true } },
          studentClasses: { include: { class: true } },
        },
      });

      return students.map(mapStudent).sort((a, b) => {
        const dayDiff = getDayRank(a.day) - getDayRank(b.day);
        if (dayDiff !== 0) return dayDiff;
        const timeDiff =
          getTimetableRank(a.timetable) - getTimetableRank(b.timetable);
        if (timeDiff !== 0) return timeDiff;
        return a.name.localeCompare(b.name);
      });
    }),

  byId: publicProcedure.input(studentIdInput).query(async ({ ctx, input }) => {
    const student = await ctx.db.student.findUnique({
      where: { id: input.id },
      include: {
        months: { include: { classes: true } },
        studentClasses: { include: { class: true } },
      },
    });

    return student ? mapStudent(student) : null;
  }),

  create: publicProcedure
    .input(studentCreateInput)
    .mutation(async ({ ctx, input }) => {
      const name =
        input.name.trim().length > 0
          ? input.name.trim().charAt(0).toUpperCase() +
            input.name.trim().slice(1)
          : input.name.trim();
      const student = await ctx.db.student.create({
        data: {
          name,
          birthday: input.birthday ? new Date(input.birthday) : undefined,
          telephone: input.telephone,
          day: input.day,
          timetable: timetableValueToName(input.timetable) ?? input.timetable,
        },
        include: {
          months: { include: { classes: true } },
          studentClasses: { include: { class: true } },
        },
      });
      return mapStudent(student as StudentWithMonths);
    }),

  update: publicProcedure
    .input(studentUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const updated = await ctx.db.student.update({
        where: { id },
        data: {
          name: rest.name
            ? rest.name.trim().charAt(0).toUpperCase() +
              rest.name.trim().slice(1)
            : undefined,
          birthday: rest.birthday ? new Date(rest.birthday) : undefined,
          telephone: rest.telephone,
          day: rest.day,
          timetable: timetableValueToName(rest.timetable) ?? rest.timetable,
        },
        include: {
          months: { include: { classes: true } },
          studentClasses: { include: { class: true } },
        },
      });
      return mapStudent(updated as StudentWithMonths);
    }),

  delete: publicProcedure
    .input(studentIdInput)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction([
        ctx.db.payment.deleteMany({ where: { studentId: input.id } }),
        ctx.db.chargeItem.deleteMany({ where: { studentId: input.id } }),
        ctx.db.makeupCredit.deleteMany({ where: { studentId: input.id } }),
        ctx.db.sessionVisit.deleteMany({ where: { studentId: input.id } }),
        ctx.db.attendanceSlot.deleteMany({
          where: { enrollment: { studentId: input.id } },
        }),
        ctx.db.monthlyEnrollment.deleteMany({ where: { studentId: input.id } }),
        ctx.db.class.deleteMany({ where: { month: { studentId: input.id } } }),
        ctx.db.month.deleteMany({ where: { studentId: input.id } }),
        ctx.db.student.delete({ where: { id: input.id } }),
      ]);
      return { success: true };
    }),

  addMonth: publicProcedure
    .input(monthInput)
    .mutation(async ({ ctx, input }) => {
      const studentExists = await ctx.db.student.findUnique({
        where: { id: input.studentId },
      });
      if (!studentExists) {
        throw new Error("Student not found");
      }

      const label = input.label.trim();
      const month = await ctx.db.month.create({
        data: {
          label,
          studentId: input.studentId,
        },
      });

      return month;
    }),

  addClass: publicProcedure
    .input(newClassInput)
    .mutation(async ({ ctx, input }) => {
      const month = await ctx.db.month.findFirst({
        where: { id: input.monthId, studentId: input.studentId },
      });
      if (!month) {
        throw new Error("Month not found for student");
      }

      await ctx.db.class.create({
        data: {
          className: input.className,
          assistance: [input.assistance ?? false],
          classPrice: new Prisma.Decimal(input.classPrice),
          classDay: input.classDay ? new Date(input.classDay) : undefined,
          classPaid: input.classPaid ?? false,
          ovenName: input.ovenName,
          ovenPrice: input.ovenPrice ?? "",
          ovenPaid: input.ovenPaid ?? false,
          materialName: input.materialName ?? "",
          materialPrice: input.materialPrice ?? "",
          materialPaid: input.materialPaid ?? false,
          monthId: input.monthId,
        },
      });

      const student = await ctx.db.student.findUnique({
        where: { id: input.studentId },
        include: {
          months: { include: { classes: true } },
          studentClasses: { include: { class: true } },
        },
      });

      return student ? mapStudent(student) : null;
    }),

  updateClass: publicProcedure
    .input(updateClassInput)
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db.class.update({
        where: { id: input.classId },
        data: {
          className: input.className,
          assistance:
            input.assistance === undefined ? undefined : [input.assistance],
          classPrice: new Prisma.Decimal(input.classPrice),
          classDay: input.classDay ? new Date(input.classDay) : undefined,
          classPaid: input.classPaid ?? undefined,
          ovenName: input.ovenName,
          ovenPrice: input.ovenPrice,
          ovenPaid: input.ovenPaid ?? undefined,
          materialName: input.materialName,
          materialPrice: input.materialPrice,
          materialPaid: input.materialPaid ?? undefined,
        },
      });
      return updated;
    }),

  deleteClass: publicProcedure
    .input(deleteClassInput)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.class.delete({ where: { id: input.classId } });
      return { success: true };
    }),

  classes: publicProcedure.query(async ({ ctx }) => {
    const classes = await ctx.db.class.findMany({
      include: { month: { include: { student: true } } },
      where: { monthId: { not: null } },
      orderBy: { createdAt: "desc" },
    });

    return classes
      .filter((cls) => cls.month)
      .map((cls) => ({
        ...cls,
        monthLabel: cls.month?.label ?? "Histórico",
        studentId: cls.month?.studentId ?? "",
        studentName: cls.month?.student.name ?? "",
      }));
  }),

  prepareMonth: publicProcedure
    .input(prepareMonthInput)
    .mutation(async ({ ctx, input }) => {
      const students = await ctx.db.student.findMany({
        where: {
          day: { not: null },
          timetable: { not: null },
        },
        orderBy: { name: "asc" },
      });

      await ctx.db.$transaction(async (tx) => {
        for (const student of students) {
          if (!student.day || !student.timetable) continue;

          const enrollment = await tx.monthlyEnrollment.upsert({
            where: {
              studentId_yearMonth: {
                studentId: student.id,
                yearMonth: input.yearMonth,
              },
            },
            create: {
              studentId: student.id,
              yearMonth: input.yearMonth,
              label: input.label.trim(),
              day: student.day,
              timetable: student.timetable,
              includedClasses: input.includedClasses,
              attendanceSlots: {
                create: createAttendanceSlotSeeds(input.includedClasses),
              },
            },
            update: {
              label: input.label.trim(),
              day: student.day,
              timetable: student.timetable,
              includedClasses: input.includedClasses,
              status: "ACTIVE",
            },
          });

          const existingSlots = await tx.attendanceSlot.findMany({
            where: { enrollmentId: enrollment.id },
            select: { slotNumber: true },
          });
          const existingNumbers = new Set(
            existingSlots.map((slot) => slot.slotNumber),
          );
          const missingSlots = createAttendanceSlotSeeds(
            input.includedClasses,
          ).filter((slot) => !existingNumbers.has(slot.slotNumber));

          if (missingSlots.length > 0) {
            await tx.attendanceSlot.createMany({
              data: missingSlots.map((slot) => ({
                ...slot,
                enrollmentId: enrollment.id,
              })),
            });
          }
        }
      });

      return { success: true, students: students.length };
    }),

  monthlyDashboard: publicProcedure
    .input(yearMonthInput)
    .query(async ({ ctx, input }) => {
      const enrollments = await ctx.db.monthlyEnrollment.findMany({
        where: { yearMonth: input.yearMonth, status: "ACTIVE" },
        include: {
          student: true,
          attendanceSlots: {
            include: { makeupCredit: true },
            orderBy: { slotNumber: "asc" },
          },
          makeupCredits: true,
          chargeItems: true,
          payments: true,
        },
        orderBy: [{ day: "asc" }, { timetable: "asc" }, { student: { name: "asc" } }],
      });

      const mappedEnrollments = enrollments.map((enrollment) => {
        const totalCharges = enrollment.chargeItems.reduce(
          (sum, item) => sum + Number(item.amount),
          0,
        );
        const totalPayments = enrollment.payments.reduce(
          (sum, payment) => sum + Number(payment.amount),
          0,
        );

        return {
          id: enrollment.id,
          yearMonth: enrollment.yearMonth,
          label: enrollment.label,
          day: enrollment.day,
          timetable:
            timetableNameToValue(enrollment.timetable) ??
            enrollment.timetable,
          includedClasses: enrollment.includedClasses,
          status: enrollment.status,
          balance: totalCharges - totalPayments,
          student: {
            id: enrollment.student.id,
            name: enrollment.student.name,
            telephone: enrollment.student.telephone,
            birthday: enrollment.student.birthday,
          },
          attendanceSlots: enrollment.attendanceSlots.map((slot) => ({
            id: slot.id,
            slotNumber: slot.slotNumber,
            status: slot.status,
            scheduledAt: slot.scheduledAt,
            attendedAt: slot.attendedAt,
            note: slot.note,
            makeupCredit: slot.makeupCredit
              ? {
                  id: slot.makeupCredit.id,
                  status: slot.makeupCredit.status,
                }
              : null,
          })),
          pendingMakeups: enrollment.makeupCredits.filter(
            (credit) => credit.status === "PENDING",
          ).length,
        };
      });

      return {
        yearMonth: input.yearMonth,
        label: mappedEnrollments[0]?.label ?? input.yearMonth,
        enrollments: mappedEnrollments.sort((a, b) => {
          const dayDiff = getDayRank(a.day) - getDayRank(b.day);
          if (dayDiff !== 0) return dayDiff;
          const timeDiff =
            getTimetableRank(a.timetable) - getTimetableRank(b.timetable);
          if (timeDiff !== 0) return timeDiff;
          return a.student.name.localeCompare(b.student.name);
        }),
      };
    }),

  markAttendance: publicProcedure
    .input(markAttendanceInput)
    .mutation(async ({ ctx, input }) => {
      const slot = await ctx.db.attendanceSlot.findUnique({
        where: { id: input.slotId },
        include: { enrollment: true, makeupCredit: true },
      });

      if (!slot) {
        throw new Error("Attendance slot not found");
      }

      const attendedAt =
        input.status === "ATTENDED" || input.status === "MADE_UP"
          ? input.date
            ? new Date(input.date)
            : new Date()
          : undefined;

      await ctx.db.$transaction(async (tx) => {
        await tx.attendanceSlot.update({
          where: { id: slot.id },
          data: {
            status: input.status,
            attendedAt,
            note: input.note,
          },
        });

        if (input.status === "MISSED_MAKEUP") {
          await tx.makeupCredit.upsert({
            where: { sourceSlotId: slot.id },
            create: {
              studentId: slot.enrollment.studentId,
              sourceEnrollmentId: slot.enrollmentId,
              sourceSlotId: slot.id,
              status: "PENDING",
              note: input.note,
            },
            update: {
              status: "PENDING",
              note: input.note,
            },
          });
          return;
        }

        if (slot.makeupCredit?.status === "PENDING") {
          await tx.makeupCredit.update({
            where: { id: slot.makeupCredit.id },
            data: { status: "CANCELLED" },
          });
        }
      });

      return { success: true };
    }),

  useMakeup: publicProcedure
    .input(useMakeupInput)
    .mutation(async ({ ctx, input }) => {
      const credit = await ctx.db.makeupCredit.findUnique({
        where: { id: input.creditId },
        include: { sourceEnrollment: true },
      });

      if (!credit || credit.status !== "PENDING") {
        throw new Error("Makeup credit is not available");
      }

      await ctx.db.$transaction(async (tx) => {
        const visit = await tx.sessionVisit.create({
          data: {
            studentId: credit.studentId,
            enrollmentId: credit.sourceEnrollmentId,
            visitDate: input.date ? new Date(input.date) : new Date(),
            day: input.day,
            timetable: timetableValueToName(input.timetable) ?? input.timetable,
            kind: "MAKEUP",
            note: input.note,
          },
        });

        await tx.makeupCredit.update({
          where: { id: credit.id },
          data: {
            status: "USED",
            usedVisitId: visit.id,
            note: input.note,
          },
        });

        await tx.attendanceSlot.update({
          where: { id: credit.sourceSlotId },
          data: { status: "MADE_UP", attendedAt: visit.visitDate },
        });
      });

      return { success: true };
    }),
});
