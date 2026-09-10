import { Stack, Text, Title } from "@mantine/core";
import React, { useMemo } from "react";
import { type Student } from "~/types/utils";
import {
  calendarDateInTimeZone,
  daysUntilNextBirthday,
  formatCalendarDate,
} from "~/lib/domain/calendar-date";
import { QueryState } from "./query-state";

export const BirthdaysSection = ({
  students,
}: {
  students?: {
    id: number;
    name: string;
    isActive: boolean;
    birthday?: Student["birthday"] | null;
  }[];
}) => {
  const studentsWithUpcomingBirthdays = useMemo(() => {
    if (!students) return [];
    const today = calendarDateInTimeZone(new Date());
    const upcoming = students
      .map((student) => {
        if (!student.isActive || !student.birthday) return null;
        const diffDays = daysUntilNextBirthday(student.birthday, today);
        if (diffDays === null) return null;
        return { student, diffDays };
      })
      .filter(
        (item): item is { student: Student; diffDays: number } => item !== null,
      )
      .sort((a, b) => a.diffDays - b.diffDays)
      .slice(0, 4)
      .map((item) => item.student);
    return upcoming;
  }, [students]);
  return (
    <section>
      <Stack gap={4}>
        <div>
          <p className="text-plum/70 text-xs tracking-[0.12em] uppercase">
            Alumnos
          </p>
          <h2 className="text-plum text-2xl font-semibold">Cumpleaños</h2>
          <p className="text-plum/80 text-sm">
            Próximos alumnos a cumplir años
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {studentsWithUpcomingBirthdays.map((student) => (
            <div
              key={student.id}
              className="border-plum/25 rounded-2xl bg-white/75 p-4 shadow-md shadow-[#a30d0d]/25"
            >
              <Title size={"lg"} className="text-plum font-semibold">
                {student.name}
              </Title>
              <div className="mt-3 flex flex-col gap-1">
                <Text className="text-plum/80 text-sm">
                  Cumpleaños:{" "}
                  {student.birthday
                    ? formatCalendarDate(student.birthday, {
                        year: undefined,
                      })
                    : "Sin fecha"}
                </Text>
              </div>
            </div>
          ))}
        </div>
        {studentsWithUpcomingBirthdays.length === 0 ? (
          <QueryState
            compact
            kind="empty"
            title="Sin cumpleaños próximos"
            description="No hay fechas cargadas para mostrar en este momento."
          />
        ) : null}
      </Stack>
    </section>
  );
};
