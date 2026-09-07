export const STUDIO_TIME_ZONE = "America/Argentina/Cordoba";

const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export type CalendarDateParts = {
  year: number;
  month: number;
  day: number;
};

export const parseCalendarDateParts = (
  value: string,
): CalendarDateParts | null => {
  const match = CALENDAR_DATE_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
};

export const isCalendarDate = (value: string) =>
  parseCalendarDateParts(value) !== null;

export const calendarDateToDatabase = (value: string) => {
  const parts = parseCalendarDateParts(value);
  if (!parts) throw new Error(`Fecha de calendario inválida: ${value}`);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
};

export const calendarDateFromDatabase = (value: Date | null | undefined) => {
  if (!value) return null;
  const year = String(value.getUTCFullYear()).padStart(4, "0");
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatCalendarDate = (
  value: string,
  options: Intl.DateTimeFormatOptions = {},
) => {
  const parts = parseCalendarDateParts(value);
  if (!parts) return "Fecha inválida";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
    ...options,
  }).format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)));
};

export const calendarDateInTimeZone = (
  now: Date,
  timeZone = STUDIO_TIME_ZONE,
) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
};

export const daysUntilNextBirthday = (birthday: string, today: string) => {
  const birth = parseCalendarDateParts(birthday);
  const current = parseCalendarDateParts(today);
  if (!birth || !current) return null;

  const todayUtc = Date.UTC(current.year, current.month - 1, current.day);
  let nextBirthday = Date.UTC(current.year, birth.month - 1, birth.day);
  if (nextBirthday < todayUtc) {
    nextBirthday = Date.UTC(current.year + 1, birth.month - 1, birth.day);
  }
  return Math.round((nextBirthday - todayUtc) / 86_400_000);
};
