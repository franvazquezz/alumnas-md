import { Stack, Text, Title } from "@mantine/core";
import React, { useMemo } from "react";
import { type Student } from "~/types/utils";

export const BirthdaysSection = ({
  students,
}: {
  students?: {
    id: number;
    name: string;
    birthday?: Student["birthday"] | null;
  }[];
}) => {
  const studentsWithUpcomingBirthdays = useMemo(() => {
    if (!students) return [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const upcoming = students
      .map((student) => {
        if (!student.birthday) return null;
        const birthdayDate = new Date(student.birthday);
        if (Number.isNaN(birthdayDate.getTime())) return null;
        const birthdayThisYear = new Date(
          today.getFullYear(),
          birthdayDate.getMonth(),
          birthdayDate.getDate(),
        );
        if (birthdayThisYear < today) {
          birthdayThisYear.setFullYear(birthdayThisYear.getFullYear() + 1);
        }
        const diffDays = Math.ceil(
          (birthdayThisYear.getTime() - today.getTime()) /
            (1000 * 60 * 60 * 24),
        );
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
                    ? new Date(student.birthday).toLocaleDateString("es-AR", {
                        month: "2-digit",
                        day: "2-digit",
                      })
                    : "Sin fecha"}
                </Text>
              </div>
            </div>
          ))}
        </div>
      </Stack>
    </section>
  );
};
