import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { isCalendarDate } from "~/lib/domain/calendar-date";
import { normalizeMoney, type PaymentStatusValue } from "~/lib/domain/money";

export const numericId = z.coerce.number().int().positive();

export const calendarDateInput = z
  .string()
  .refine(isCalendarDate, "La fecha debe tener el formato AAAA-MM-DD");

export const optionalCalendarDateInput = calendarDateInput
  .nullable()
  .optional();

export const weekdayInput = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

export const paymentStatusInput = z.enum(["PENDING", "PAID"]);

export const moneyInput = z
  .union([z.string(), z.number()])
  .transform((value, context) => {
    const normalized = normalizeMoney(value);
    if (!normalized) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El importe debe ser positivo y tener hasta dos decimales",
      });
      return z.NEVER;
    }
    return normalized;
  });

export const studentSearchInput = z
  .object({ search: z.string().optional() })
  .optional();

export const studentIdInput = z.object({ id: numericId });

export const studentCreateInput = z.object({
  name: z.string().min(1),
  birthday: optionalCalendarDateInput,
  telephone: z.string().optional(),
  weekday: weekdayInput.nullable().optional(),
  timetable: z.enum(["10:00", "16:00", "18:30"]).optional(),
  isActive: z.boolean().optional(),
});

export const studentUpdateInput = z.object({
  id: numericId,
  name: z.string().min(1).optional(),
  birthday: optionalCalendarDateInput,
  telephone: z.string().optional(),
  weekday: weekdayInput.nullable().optional(),
  timetable: z.enum(["10:00", "16:00", "18:30"]).optional(),
  isActive: z.boolean().optional(),
});

export const monthInput = z.object({
  studentId: numericId,
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

export const classBaseInput = z.object({
  className: z.string().min(1),
  assistance: z.boolean().optional(),
  classPrice: moneyInput,
  classDay: optionalCalendarDateInput,
  classPaymentStatus: paymentStatusInput.optional(),
  ovenName: z.string().optional(),
  ovenPrice: moneyInput.optional(),
  ovenPaymentStatus: paymentStatusInput.optional(),
  materialName: z.string().optional(),
  materialPrice: moneyInput.optional(),
  materialPaymentStatus: paymentStatusInput.optional(),
});

export const newClassInput = classBaseInput.extend({
  studentId: numericId,
  monthId: numericId,
});

export const updateClassInput = classBaseInput.extend({
  classId: numericId,
});

export const deleteClassInput = z.object({ classId: numericId });

export type MonthWithClasses = Prisma.MonthGetPayload<{
  include: { classes: true };
}>;

export type StudentWithMonths = Prisma.StudentGetPayload<{
  include: { months: { include: { classes: true } } };
}>;

export type TimetableOption = "10:00" | "16:00" | "18:30" | undefined;
export type WeekdayOption = z.infer<typeof weekdayInput>;

export type StudentFormState = {
  name: string;
  birthday: string;
  telephone: string;
  weekday: WeekdayOption | null;
  timetable: TimetableOption;
  isActive: boolean;
};

export type ClassFormState = {
  className: string;
  classPrice: string;
  classDay: string;
  classPaymentStatus: PaymentStatusValue;
  monthId: number | null;
  assistance: boolean;
  ovenName: string;
  ovenPrice: string;
  ovenPaymentStatus: PaymentStatusValue;
  materialName: string;
  materialPrice: string;
  materialPaymentStatus: PaymentStatusValue;
};
