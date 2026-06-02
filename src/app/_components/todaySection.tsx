"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  LuCalendarDays,
  LuCheck,
  LuChevronRight,
  LuCircleDollarSign,
  LuClipboardList,
  LuMessageCircle,
  LuRefreshCcw,
  LuUserX,
} from "react-icons/lu";

import { api, type RouterOutputs } from "~/trpc/react";
import { WEEK_DAYS, type Student } from "~/types/utils";

const TURNS = ["10:00", "16:00", "18:30"] as const;
const TARGET_STUDENTS_PER_TURN = 4;

type Turn = (typeof TURNS)[number];
type MonthlyDashboard = RouterOutputs["students"]["monthlyDashboard"];
type Enrollment = MonthlyDashboard["enrollments"][number];
type AttendanceSlot = Enrollment["attendanceSlots"][number];

type TodaySectionProps = {
  isLoading: boolean;
  students?: Student[];
  monthlyDashboard?: MonthlyDashboard;
};

const moneyFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
  style: "currency",
  currency: "ARS",
});

const formatMoney = (value: number) => moneyFormatter.format(value);

const getCurrentMonthInfo = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const label = now.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

  return {
    yearMonth: `${year}-${month}`,
    label: label.charAt(0).toUpperCase() + label.slice(1),
  };
};

const getTodayInfo = () => {
  const now = new Date();
  const day = WEEK_DAYS.find((weekDay) => weekDay.value === now.getDay());
  return {
    date: now.toISOString().slice(0, 10),
    dayLabel: day?.label ?? "Hoy",
    dayValue: day?.value ?? null,
  };
};

const normalizeDay = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/á/g, "a")
    .replace(/é/g, "e")
    .replace(/í/g, "i")
    .replace(/ó/g, "o")
    .replace(/ú/g, "u");

const enrollmentMatchesToday = (enrollment: Enrollment, dayLabel: string) =>
  normalizeDay(enrollment.day).startsWith(normalizeDay(dayLabel));

const getProgress = (slots: AttendanceSlot[]) => {
  const attended = slots.filter(
    (slot) => slot.status === "ATTENDED" || slot.status === "MADE_UP",
  ).length;
  const missedWithMakeup = slots.filter(
    (slot) => slot.status === "MISSED_MAKEUP",
  ).length;
  const pending = slots.filter((slot) => slot.status === "PENDING").length;

  return { attended, missedWithMakeup, pending, total: slots.length };
};

const getNextActionSlot = (slots: AttendanceSlot[]) =>
  slots.find((slot) => slot.status === "PENDING") ?? slots.at(-1) ?? null;

const statusLabel: Record<AttendanceSlot["status"], string> = {
  PENDING: "Pendiente",
  ATTENDED: "Vino",
  MISSED_MAKEUP: "Repone",
  MISSED_NO_MAKEUP: "Faltó",
  MADE_UP: "Repuesta",
};

export const TodaySection = ({
  isLoading,
  students,
  monthlyDashboard,
}: TodaySectionProps) => {
  const utils = api.useUtils();
  const todayInfo = useMemo(() => getTodayInfo(), []);
  const monthInfo = useMemo(() => getCurrentMonthInfo(), []);
  const [selectedTurn, setSelectedTurn] = useState<Turn>("10:00");

  const prepareMonth = api.students.prepareMonth.useMutation({
    onSuccess: async () => {
      await utils.students.monthlyDashboard.invalidate({
        yearMonth: monthInfo.yearMonth,
      });
    },
  });

  const markAttendance = api.students.markAttendance.useMutation({
    onSuccess: async () => {
      await utils.students.monthlyDashboard.invalidate({
        yearMonth: monthInfo.yearMonth,
      });
    },
  });

  const activeEnrollments = useMemo(
    () => monthlyDashboard?.enrollments ?? [],
    [monthlyDashboard?.enrollments],
  );
  const todayEnrollments = useMemo(
    () =>
      activeEnrollments.filter((enrollment) =>
        enrollmentMatchesToday(enrollment, todayInfo.dayLabel),
      ),
    [activeEnrollments, todayInfo.dayLabel],
  );

  const groupedByTurn = useMemo(() => {
    const groups = new Map<Turn, Enrollment[]>();
    TURNS.forEach((turn) => groups.set(turn, []));

    for (const enrollment of todayEnrollments) {
      if (
        enrollment.timetable === "10:00" ||
        enrollment.timetable === "16:00" ||
        enrollment.timetable === "18:30"
      ) {
        groups.get(enrollment.timetable)?.push(enrollment);
      }
    }

    for (const [turn, enrollments] of groups) {
      groups.set(
        turn,
        enrollments
          .slice()
          .sort((a, b) => a.student.name.localeCompare(b.student.name)),
      );
    }

    return groups;
  }, [todayEnrollments]);

  const selectedEnrollments = groupedByTurn.get(selectedTurn) ?? [];
  const totalBalance = todayEnrollments.reduce(
    (sum, enrollment) => sum + enrollment.balance,
    0,
  );
  const hasStudents = (students?.length ?? 0) > 0;
  const hasMonthlyEnrollments = activeEnrollments.length > 0;

  const handlePrepareMonth = () => {
    prepareMonth.mutate({
      yearMonth: monthInfo.yearMonth,
      label: monthInfo.label,
      includedClasses: 4,
    });
  };

  const handleMark = (
    slot: AttendanceSlot | null,
    status: "ATTENDED" | "MISSED_MAKEUP" | "MISSED_NO_MAKEUP",
  ) => {
    if (!slot) return;
    markAttendance.mutate({
      slotId: slot.id,
      status,
      date: todayInfo.date,
    });
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-3xl bg-plum p-5 text-sand shadow-xl shadow-[#582b39]/20 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-sand/70 uppercase">
                <LuCalendarDays className="h-4 w-4" />
                Mes activo
              </p>
              <h1 className="mt-2 text-3xl font-black">
                {monthlyDashboard?.label ?? monthInfo.label}
              </h1>
              <p className="mt-1 text-sm text-sand/75">
                {todayInfo.dayLabel}: asistencia, reposiciones y cobros del
                turno.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
              <p className="text-xs text-sand/70">Pendiente</p>
              <p className="text-xl font-black">{formatMoney(totalBalance)}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-black/15 p-1">
            {TURNS.map((turn) => {
              const count = groupedByTurn.get(turn)?.length ?? 0;
              const isActive = selectedTurn === turn;
              return (
                <button
                  key={turn}
                  type="button"
                  onClick={() => setSelectedTurn(turn)}
                  className={`rounded-xl px-2 py-3 text-center text-sm font-bold transition ${
                    isActive
                      ? "bg-sand text-plum shadow-sm"
                      : "text-sand/80 hover:bg-white/10"
                  }`}
                >
                  <span className="block">{turn}</span>
                  <span className="text-[11px] font-semibold opacity-75">
                    {count}/{TARGET_STUDENTS_PER_TURN}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!hasMonthlyEnrollments ? (
        <div className="rounded-3xl border border-plum/15 bg-white/90 p-5 shadow-lg shadow-[#a30d0d]/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-plum/60 uppercase">
                Todavía no hay mes preparado
              </p>
              <h2 className="mt-1 text-2xl font-black text-plum">
                Crear 4 asistencias para cada alumna
              </h2>
              <p className="mt-1 text-sm text-plum/70">
                Se toman las alumnas con día y horario asignado y se crea su
                ficha mensual.
              </p>
            </div>
            <button
              type="button"
              disabled={!hasStudents || prepareMonth.isPending}
              onClick={handlePrepareMonth}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-sand shadow-md shadow-[#a30d0d]/20 disabled:opacity-50"
            >
              <LuClipboardList className="h-4 w-4" />
              {prepareMonth.isPending ? "Preparando..." : "Preparar mes"}
            </button>
          </div>
          {!hasStudents ? (
            <p className="mt-3 rounded-2xl bg-sand px-4 py-3 text-sm text-plum/70">
              Primero cargá alumnas y asignales día/horario.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {isLoading ? (
          <div className="rounded-3xl bg-white/80 p-5 text-sm font-semibold text-plum shadow-sm">
            Cargando mes...
          </div>
        ) : null}

        {!isLoading && hasMonthlyEnrollments && selectedEnrollments.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-plum/25 bg-white/70 p-5 text-plum">
            <p className="font-semibold">No hay inscriptas en este turno.</p>
            <p className="mt-1 text-sm text-plum/70">
              El mes activo existe, pero no tiene alumnas para{" "}
              {todayInfo.dayLabel} a las {selectedTurn}.
            </p>
          </div>
        ) : null}

        {selectedEnrollments.map((enrollment) => {
          const nextSlot = getNextActionSlot(enrollment.attendanceSlots);
          const progress = getProgress(enrollment.attendanceSlots);
          const hasPhone = Boolean(enrollment.student.telephone?.trim());
          const whatsappUrl = hasPhone
            ? `https://wa.me/${enrollment.student.telephone?.replace(/\D/g, "")}`
            : undefined;

          return (
            <article
              key={enrollment.id}
              className="rounded-3xl bg-white/90 p-4 shadow-lg shadow-[#a30d0d]/10 ring-1 ring-plum/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-[0.12em] text-plum/55 uppercase">
                    {selectedTurn} - {progress.attended}/{progress.total}
                  </p>
                  <h2 className="text-2xl font-black text-plum">
                    {enrollment.student.name}
                  </h2>
                  <p className="mt-1 text-sm text-plum/70">
                    {progress.pending} pendientes - {progress.missedWithMakeup}{" "}
                    para reponer
                  </p>
                </div>
                <div
                  className={`rounded-2xl px-3 py-2 text-right ${
                    enrollment.balance > 0
                      ? "bg-primary/10 text-primary"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <p className="text-[11px] font-semibold uppercase">
                    {enrollment.balance > 0 ? "Debe" : "Al día"}
                  </p>
                  <p className="text-lg font-black">
                    {formatMoney(enrollment.balance)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                {enrollment.attendanceSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className={`rounded-2xl px-2 py-3 text-center text-xs font-bold ${
                      slot.status === "ATTENDED" || slot.status === "MADE_UP"
                        ? "bg-emerald-50 text-emerald-700"
                        : slot.status === "MISSED_MAKEUP"
                          ? "bg-secondary/20 text-plum"
                          : slot.status === "MISSED_NO_MAKEUP"
                            ? "bg-primary/10 text-primary"
                            : "bg-sand text-plum"
                    }`}
                  >
                    <span className="block text-base">{slot.slotNumber}</span>
                    <span>{statusLabel[slot.status]}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={!nextSlot || markAttendance.isPending}
                  onClick={() => handleMark(nextSlot, "ATTENDED")}
                  className="inline-flex min-h-12 items-center justify-center gap-1 rounded-2xl bg-primary px-2 py-3 text-sm font-bold text-sand shadow-md shadow-[#a30d0d]/20 disabled:opacity-50"
                >
                  <LuCheck className="h-4 w-4" />
                  Vino
                </button>
                <button
                  type="button"
                  disabled={!nextSlot || markAttendance.isPending}
                  onClick={() => handleMark(nextSlot, "MISSED_MAKEUP")}
                  className="inline-flex min-h-12 items-center justify-center gap-1 rounded-2xl border border-plum/15 bg-white px-2 py-3 text-sm font-bold text-plum disabled:opacity-50"
                >
                  <LuRefreshCcw className="h-4 w-4" />
                  Repone
                </button>
                <button
                  type="button"
                  disabled={!nextSlot || markAttendance.isPending}
                  onClick={() => handleMark(nextSlot, "MISSED_NO_MAKEUP")}
                  className="inline-flex min-h-12 items-center justify-center gap-1 rounded-2xl border border-primary/20 bg-primary/10 px-2 py-3 text-sm font-bold text-primary disabled:opacity-50"
                >
                  <LuUserX className="h-4 w-4" />
                  Faltó
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href={`/students/${enrollment.student.id}`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-plum/15 bg-white px-3 py-2 text-sm font-bold text-plum"
                >
                  <LuCircleDollarSign className="h-4 w-4" />
                  Cobrar
                </Link>
                {whatsappUrl ? (
                  <Link
                    href={whatsappUrl}
                    target="_blank"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#e6f7ee] px-3 py-2 text-sm font-bold text-[#166534]"
                  >
                    <LuMessageCircle className="h-4 w-4" />
                    WhatsApp
                  </Link>
                ) : (
                  <Link
                    href={`/students/${enrollment.student.id}`}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-sand px-3 py-2 text-sm font-bold text-plum"
                  >
                    Ver ficha
                    <LuChevronRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
