import type { Prisma } from "@prisma/client";
import { z } from "zod";

export const numericId = z.string().uuid();

export const dateString = z
  .string()
  .optional()
  .refine((val) => !val || !Number.isNaN(Date.parse(val)), {
    message: "Invalid date",
  });

export const studentSearchInput = z
  .object({ search: z.string().optional() })
  .optional();

export const studentIdInput = z.object({ id: numericId });

export const studentCreateInput = z.object({
  name: z.string().min(1),
  birthday: dateString,
  telephone: z.string().optional(),
  day: z.string().optional(),
  timetable: z.enum(["10:00", "16:00", "18:30"]).optional(),
});

export const studentUpdateInput = z.object({
  id: numericId,
  name: z.string().min(1).optional(),
  birthday: dateString,
  telephone: z.string().optional(),
  day: z.string().optional(),
  timetable: z.enum(["10:00", "16:00", "18:30"]).optional(),
});

export const monthInput = z.object({
  studentId: numericId,
  label: z.string().min(1),
});

export const classBaseInput = z.object({
  className: z.string().min(1),
  assistance: z.boolean().optional(),
  classPrice: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === "number" ? val : Number(val))),
  classDay: dateString,
  classPaid: z.boolean().optional(),
  ovenName: z.string().optional(),
  ovenPrice: z.string().optional(),
  ovenPaid: z.boolean().optional(),
  materialName: z.string().optional(),
  materialPrice: z.string().optional(),
  materialPaid: z.boolean().optional(),
});

export const newClassInput = classBaseInput.extend({
  studentId: numericId,
  monthId: numericId,
});

export const updateClassInput = classBaseInput.extend({
  classId: numericId,
});

export const deleteClassInput = z.object({ classId: numericId });

export const yearMonthInput = z.object({
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
});

export const prepareMonthInput = yearMonthInput.extend({
  label: z.string().min(1),
  includedClasses: z.coerce.number().int().min(1).max(8).default(4),
});

export const attendanceStatusInput = z.enum([
  "PENDING",
  "ATTENDED",
  "MISSED_MAKEUP",
  "MISSED_NO_MAKEUP",
  "MADE_UP",
]);

export const markAttendanceInput = z.object({
  slotId: numericId,
  status: attendanceStatusInput,
  date: dateString,
  note: z.string().optional(),
});

export const useMakeupInput = z.object({
  creditId: numericId,
  date: dateString,
  day: z.string().min(1),
  timetable: z.enum(["10:00", "16:00", "18:30"]),
  note: z.string().optional(),
});

export type MonthWithClasses = Prisma.MonthGetPayload<{
  include: { classes: true };
}>;

export type StudentWithMonths = Prisma.StudentGetPayload<{
  include: {
    months: { include: { classes: true } };
    studentClasses: { include: { class: true } };
  };
}>;

export type TimetableOption = "10:00" | "16:00" | "18:30" | undefined;

export type StudentFormState = {
  name: string;
  birthday: string;
  telephone: string;
  day: string;
  timetable: TimetableOption;
};

export type ClassFormState = {
  className: string;
  classPrice: string;
  classDay: string;
  classPaid: boolean;
  monthId: string | null;
  assistance: boolean;
  ovenName: string;
  ovenPrice: string;
  ovenPaid: boolean;
  materialName: string;
  materialPrice: string;
  materialPaid: boolean;
};
