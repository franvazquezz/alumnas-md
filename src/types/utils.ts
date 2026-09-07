import { type RouterOutputs } from "~/trpc/react";
import {
  type ClassFormState,
  type StudentFormState,
  type WeekdayOption,
} from "./students";

export const WEEK_DAYS = [
  { value: "MONDAY", label: "Lunes" },
  { value: "TUESDAY", label: "Martes" },
  { value: "WEDNESDAY", label: "Miércoles" },
  { value: "THURSDAY", label: "Jueves" },
  { value: "FRIDAY", label: "Viernes" },
  { value: "SATURDAY", label: "Sábado" },
  { value: "SUNDAY", label: "Domingo" },
] as const;

export type DayOption = (typeof WEEK_DAYS)[number];

export type CalendarDayKey = WeekdayOption | "unscheduled";

export type CalendarEntry = {
  id: number;
  day: CalendarDayKey;
  dayLabel: string;
  time: string;
  student: string;
  className?: string;
  classDateLabel?: string;
};

export const emptyStudent: StudentFormState = {
  name: "",
  birthday: "",
  telephone: "",
  weekday: null,
  timetable: "10:00",
  isActive: true,
};

export const emptyClassDraft: ClassFormState = {
  className: "",
  classPrice: "",
  classDay: "",
  classPaymentStatus: "PENDING",
  monthId: null,
  assistance: false,
  ovenName: "",
  ovenPrice: "",
  ovenPaymentStatus: "PENDING",
  materialName: "",
  materialPrice: "",
  materialPaymentStatus: "PENDING",
};

export type Student = RouterOutputs["students"]["list"][number];

export const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export const TIME_REGEX = /(\d{1,2}):(\d{2})/;

export const getWeekday = (value?: WeekdayOption | null): DayOption | null => {
  if (!value) return null;
  return WEEK_DAYS.find((day) => day.value === value) ?? null;
};

export const formatMonth = (year: number, month: number) =>
  `${MONTH_NAMES[month - 1] ?? "Mes inválido"} ${year}`;

export const parseTimeToMinutes = (time: string) => {
  const match = TIME_REGEX.exec(time);
  if (!match) return Number.POSITIVE_INFINITY;
  const hours = Number.parseInt(match[1] ?? "0", 10);
  const minutes = Number.parseInt(match[2] ?? "0", 10);
  return hours * 60 + minutes;
};
