import { Stack, Text, Title } from "@mantine/core";
import { ButtonM } from "./button";
import Link from "next/link";
import { LuTrash2 } from "react-icons/lu";
import {
  getDayFromString,
  parseTimeToMinutes,
  WEEK_DAYS,
  type Student,
} from "~/types/utils";
import { api } from "~/trpc/react";
import { showNotification } from "@mantine/notifications";
import { useMemo } from "react";

export const StudentsSection = ({
  isLoading,
  students,
}: {
  isLoading: boolean;
  students?: Student[];
}) => {
  const utils = api.useUtils();

  const deleteStudent = api.students.delete.useMutation({
    onSuccess: async () => {
      await utils.students.list.invalidate();
      showNotification({ color: "green", message: "Alumno eliminado" });
    },
    onError: () =>
      showNotification({
        color: "red",
        message: "No se pudo eliminar el alumno",
      }),
  });

  const groupedStudents = useMemo(() => {
    if (!students) return [];
    const dayMap = new Map<
      number | "unscheduled",
      { label: string; times: Map<string, Student[]> }
    >();

    for (const student of students) {
      const preferredDay = getDayFromString(student.day ?? undefined);
      const dayKey = preferredDay?.value ?? "unscheduled";
      const dayLabel = preferredDay?.label ?? "Sin día";
      const time = student.timetable?.trim() ?? "Sin horario";

      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, { label: dayLabel, times: new Map() });
      }

      const dayEntry = dayMap.get(dayKey);
      if (!dayEntry) continue;
      if (!dayEntry.times.has(time)) {
        dayEntry.times.set(time, []);
      }
      dayEntry.times.get(time)?.push(student);
    }

    const baseDays = WEEK_DAYS.map((day) => ({
      key: day.value,
      label: day.label,
    }));
    const needsUnscheduled = dayMap.has("unscheduled");
    const orderedDays = needsUnscheduled
      ? [...baseDays, { key: "unscheduled" as const, label: "Sin día" }]
      : baseDays;

    return orderedDays
      .filter((day) => dayMap.has(day.key))
      .map((day) => {
        const dayEntry = dayMap.get(day.key);
        const times = Array.from(dayEntry?.times.entries() ?? []).sort(
          ([a], [b]) => parseTimeToMinutes(a) - parseTimeToMinutes(b),
        );
        return {
          key: day.key,
          label: dayEntry?.label ?? day.label,
          times: times.map(([time, list]) => ({ time, students: list })),
        };
      });
  }, [students]);
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-plum/70 text-xs tracking-[0.12em] uppercase">
            Alumnos
          </p>
          <h2 className="text-plum text-2xl font-semibold">Listado</h2>
        </div>
        <div className="flex items-center gap-3">
          {isLoading && <p className="text-plum/60 text-sm">Cargando...</p>}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {groupedStudents.map((dayGroup) => (
          <div key={dayGroup.label} className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary rounded-full px-4 py-1 text-xs font-semibold tracking-[0.12em] uppercase">
                {dayGroup.label}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {dayGroup.times.map((timeGroup) => (
                <div
                  key={`${dayGroup.label}-${timeGroup.time}`}
                  className="border-plum/15 rounded-2xl p-4"
                >
                  <Text className="text-plum/70 text-xs tracking-[0.12em] uppercase">
                    {dayGroup.label} {timeGroup.time}
                  </Text>
                  <div className="mt-3 flex flex-col gap-3">
                    {timeGroup.students.map((student) => (
                      <Stack
                        key={student.id}
                        className="border-plum/10 gap-3 rounded-2xl bg-white/70 p-3 shadow-sm shadow-[#a30d0d]/10"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Title
                              size={"lg"}
                              className="text-plum font-semibold"
                            >
                              {student.name}
                            </Title>
                            <Text className="text-plum/70 text-xs">
                              {student.day
                                ? `Día: ${student.day}`
                                : "Sin día asignado"}
                            </Text>
                            <Text className="text-plum/60 text-xs">
                              {student.classes.length} clases
                            </Text>
                          </div>
                          <div className="flex gap-2">
                            <ButtonM variant="danger">
                              <Link href={`/students/${student.id}`}>
                                <Text size="xs">Ver detalle</Text>
                              </Link>
                            </ButtonM>
                            <ButtonM
                              variant="danger"
                              onClick={() =>
                                deleteStudent.mutate({ id: student.id })
                              }
                              loading={deleteStudent.isPending}
                            >
                              <LuTrash2 className="h-4 w-4" />
                            </ButtonM>
                          </div>
                        </div>
                      </Stack>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {!isLoading && (students?.length ?? 0) === 0 ? (
          <p className="border-plum/30 text-plum/70 rounded-2xl border border-dashed bg-white/60 p-6 text-center text-sm">
            Aún no hay alumnos cargados. Crea el primero para empezar a
            registrar clases.
          </p>
        ) : null}
      </div>
    </section>
  );
};
