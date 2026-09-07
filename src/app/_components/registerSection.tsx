import React, { useState } from "react";
import { LuPlus } from "react-icons/lu";
import { ButtonM } from "./button";
import { api } from "~/trpc/react";
import { showNotification } from "@mantine/notifications";
import { emptyStudent, WEEK_DAYS } from "~/types/utils";
import type { WeekdayOption } from "~/types/students";

export const RegisterSection = () => {
  const [showCreateStudent, setShowCreateStudent] = useState(false);
  const [studentForm, setStudentForm] = useState({ ...emptyStudent });

  const utils = api.useUtils();
  const createStudent = api.students.create.useMutation({
    onSuccess: async () => {
      await utils.students.list.invalidate();
      setStudentForm({ ...emptyStudent });
      showNotification({
        title: "Alumno creado",
        color: "green",
        message: "El alumno fue creado exitosamente",
      });
    },
    onError: () =>
      showNotification({ color: "red", message: "No se pudo crear el alumno" }),
  });

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    createStudent.mutate({
      ...studentForm,
      birthday: studentForm.birthday ?? undefined,
      telephone: studentForm.telephone ?? undefined,
      weekday: studentForm.weekday,
      timetable: studentForm.timetable ?? undefined,
      isActive: studentForm.isActive,
    });
  };

  return (
    <section className="ring-plum/10 grid gap-6 rounded-3xl bg-white/80 p-6 shadow-lg ring-1 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <p className="text-plum/70 text-xs tracking-[0.12em] uppercase">
          Nuevo alumno
        </p>
        <h2 className="text-plum text-2xl font-semibold">Registrar</h2>
        <p className="text-plum/80 text-sm">
          Crea alumnos con su información básica.
        </p>
        <ButtonM
          type="button"
          variant="ghost"
          onClick={() => setShowCreateStudent((prev) => !prev)}
        >
          {showCreateStudent ? "Ocultar" : "Mostrar"} formulario
        </ButtonM>
      </div>
      {showCreateStudent ? (
        <form
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          onSubmit={handleCreateStudent}
        >
          <input
            required
            value={studentForm.name}
            onChange={(e) =>
              setStudentForm({ ...studentForm, name: e.target.value })
            }
            placeholder="Nombre completo"
            className="border-plum/20 text-ink ring-primary/20 rounded-xl border bg-white/80 px-4 py-2 text-sm transition outline-none focus:ring-2"
          />
          <input
            type="date"
            value={studentForm.birthday}
            onChange={(e) =>
              setStudentForm({ ...studentForm, birthday: e.target.value })
            }
            className="border-plum/20 text-ink ring-primary/20 rounded-xl border bg-white/80 px-4 py-2 text-sm transition outline-none focus:ring-2"
          />
          <input
            value={studentForm.telephone}
            onChange={(e) =>
              setStudentForm({ ...studentForm, telephone: e.target.value })
            }
            placeholder="Teléfono"
            className="border-plum/20 text-ink ring-primary/20 rounded-xl border bg-white/80 px-4 py-2 text-sm transition outline-none focus:ring-2"
          />
          <select
            value={studentForm.weekday ?? ""}
            onChange={(e) =>
              setStudentForm({
                ...studentForm,
                weekday: (e.target.value || null) as WeekdayOption | null,
              })
            }
            className="border-plum/20 text-ink ring-primary/20 rounded-xl border bg-white/80 px-4 py-2 text-sm transition outline-none focus:ring-2"
          >
            <option value="">Seleccionar día</option>
            {WEEK_DAYS.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
          <select
            value={studentForm.timetable}
            onChange={(e) =>
              setStudentForm({
                ...studentForm,
                timetable:
                  e.target.value === "10:00"
                    ? "10:00"
                    : e.target.value === "16:00"
                      ? "16:00"
                      : e.target.value === "18:30"
                        ? "18:30"
                        : undefined,
              })
            }
            className="border-plum/20 text-ink ring-primary/20 rounded-xl border bg-white/80 px-4 py-2 text-sm transition outline-none focus:ring-2"
          >
            <option value="">Seleccionar horario</option>
            <option key={1} value={"10:00"}>
              10:00
            </option>
            <option key={2} value={"16:00"}>
              16:00
            </option>
            <option key={3} value={"18:30"}>
              18:30
            </option>
          </select>
          <div className="flex items-center justify-end sm:col-span-2">
            <ButtonM type="submit" loading={createStudent.isPending}>
              <LuPlus className="h-4 w-4" />
              Crear alumno
            </ButtonM>
          </div>
        </form>
      ) : null}
    </section>
  );
};
