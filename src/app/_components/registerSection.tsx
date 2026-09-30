import React, { useState } from "react";
import { LuPlus } from "react-icons/lu";
import { ButtonM } from "./button";
import { api } from "~/trpc/react";
import { showNotification } from "@mantine/notifications";
import { emptyStudent } from "~/types/utils";
import { StudentFields } from "./student-fields";
import { QueryState } from "./query-state";

export const RegisterSection = () => {
  const [showCreateStudent, setShowCreateStudent] = useState(false);
  const [studentForm, setStudentForm] = useState({ ...emptyStudent });

  const utils = api.useUtils();
  const shiftsQuery = api.students.formOptions.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
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
      birthday: studentForm.birthday || undefined,
      telephone: studentForm.telephone || undefined,
      weekday: studentForm.weekday,
      shiftId: studentForm.shiftId,
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
        shiftsQuery.isLoading ? (
          <QueryState
            compact
            kind="loading"
            title="Cargando formulario"
            description="Estamos obteniendo los turnos disponibles."
          />
        ) : shiftsQuery.isError ? (
          <QueryState
            compact
            kind="error"
            title="No pudimos cargar los turnos"
            description="Reintenta antes de registrar un alumno."
            onRetry={() => void shiftsQuery.refetch()}
          />
        ) : (
          <form
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            onSubmit={handleCreateStudent}
          >
            <StudentFields
              form={studentForm}
              onChange={setStudentForm}
              shifts={shiftsQuery.data?.filter((shift) => shift.isActive) ?? []}
            />
            <div className="flex items-center justify-end sm:col-span-2">
              <ButtonM type="submit" loading={createStudent.isPending}>
                <LuPlus className="h-4 w-4" />
                Crear alumno
              </ButtonM>
            </div>
          </form>
        )
      ) : null}
    </section>
  );
};
