"use client";

import { notifications } from "@mantine/notifications";
import { useState, type FormEvent } from "react";
import { LuPlus } from "react-icons/lu";

import { ButtonM } from "~/app/_components/button";
import { api } from "~/trpc/react";
import type { ClassFormState } from "~/types/students";
import type { Student } from "~/types/utils";
import { ClassFields, classToDraft, emptyClassDraft } from "./class-fields";
import { StudentClassEditor } from "./student-class-editor";
import { StudentClassSummary } from "./student-class-summary";
import { StudentMonthsManager } from "./student-months-manager";

const notify = (type: "success" | "error", message: string) =>
  notifications.show({
    message,
    color: type === "success" ? "green" : "red",
  });

export function StudentClassesSection({ data }: { data: Student }) {
  const studentId = data.id;
  const utils = api.useUtils();
  const [classDrafts, setClassDrafts] = useState<
    Record<number, ClassFormState>
  >(() =>
    Object.fromEntries(
      data.classes.map((classItem) => [classItem.id, classToDraft(classItem)]),
    ),
  );
  const [newClass, setNewClass] = useState<ClassFormState>(() =>
    emptyClassDraft(data.months[0]?.id ?? null),
  );
  const [newMonth, setNewMonth] = useState("");
  const [showAddMonth, setShowAddMonth] = useState(data.months.length === 0);
  const [showAddClass, setShowAddClass] = useState(data.classes.length === 0);
  const [showEditClasses, setShowEditClasses] = useState(false);

  const invalidateStudent = () =>
    Promise.all([
      utils.students.byId.invalidate({ id: studentId }),
      utils.students.list.invalidate(),
    ]);

  const updateClass = api.students.updateClass.useMutation({
    onSuccess: async () => {
      await invalidateStudent();
      notify("success", "Clase actualizada");
    },
    onError: () => notify("error", "No se pudo actualizar la clase"),
  });

  const addMonth = api.students.addMonth.useMutation({
    onSuccess: async (createdMonth) => {
      await invalidateStudent();
      setNewMonth("");
      setNewClass((previous) => ({
        ...previous,
        monthId: previous.monthId ?? createdMonth.id,
      }));
      notify("success", "Mes creado");
    },
    onError: () => notify("error", "No se pudo crear el mes"),
  });

  const addClass = api.students.addClass.useMutation({
    onSuccess: async (_created, variables) => {
      await invalidateStudent();
      setNewClass(emptyClassDraft(variables.monthId));
      notify("success", "Clase creada");
    },
    onError: () => notify("error", "No se pudo crear la clase"),
  });

  const handleClassDraftChange = (
    classId: number,
    patch: Partial<ClassFormState>,
  ) => {
    const classItem = data.classes.find(
      (candidate) => candidate.id === classId,
    );
    if (!classItem) return;

    setClassDrafts((previous) => ({
      ...previous,
      [classId]: {
        ...(previous[classId] ?? classToDraft(classItem)),
        ...patch,
      },
    }));
  };

  const handleSaveClass = (classId: number) => {
    const classItem = data.classes.find(
      (candidate) => candidate.id === classId,
    );
    if (!classItem) return;
    const draft = classDrafts[classId] ?? classToDraft(classItem);

    updateClass.mutate({
      classId,
      className: draft.className,
      classPrice: draft.classPrice,
      classDay: draft.classDay || null,
      classPaymentStatus: draft.classPaymentStatus,
      assistance: draft.assistance,
      ovenName: draft.ovenName || undefined,
      ovenPrice: draft.ovenPrice || undefined,
      ovenPaymentStatus: draft.ovenPaymentStatus,
      materialName: draft.materialName || undefined,
      materialPrice: draft.materialPrice || undefined,
      materialPaymentStatus: draft.materialPaymentStatus,
    });
  };

  const handleAddClass = (event: FormEvent) => {
    event.preventDefault();
    if (!newClass.className || !newClass.classPrice || !newClass.monthId)
      return;

    addClass.mutate({
      studentId,
      className: newClass.className,
      classPrice: newClass.classPrice,
      classDay: newClass.classDay || null,
      classPaymentStatus: newClass.classPaymentStatus,
      monthId: newClass.monthId,
      assistance: newClass.assistance,
      ovenName: newClass.ovenName || undefined,
      ovenPrice: newClass.ovenPrice || undefined,
      ovenPaymentStatus: newClass.ovenPaymentStatus,
      materialName: newClass.materialName || undefined,
      materialPrice: newClass.materialPrice || undefined,
      materialPaymentStatus: newClass.materialPaymentStatus,
    });
  };

  const handleAddMonth = (event: FormEvent) => {
    event.preventDefault();
    const [year, month] = newMonth.split("-").map(Number);
    if (!year || !month) return;
    addMonth.mutate({ studentId, year, month });
  };

  return (
    <section className="ring-plum/10 space-y-6 rounded-3xl bg-white/85 p-6 shadow-lg ring-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-plum/70 text-xs tracking-widest uppercase">
            Clases
          </p>
          <h2 className="text-plum text-2xl font-semibold">
            Clases del alumno
          </h2>
        </div>
        {updateClass.isPending ? (
          <span className="text-plum/70 text-xs">Guardando cambios...</span>
        ) : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <StudentMonthsManager
            months={data.months}
            newMonth={newMonth}
            showForm={showAddMonth}
            isSaving={addMonth.isPending}
            onMonthChange={setNewMonth}
            onSubmit={handleAddMonth}
            onToggle={() => setShowAddMonth((visible) => !visible)}
          />

          <section className="border-secondary/30 bg-secondary/10 rounded-3xl border p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <h3 className="text-plum text-sm font-semibold">
                Agregar nueva clase
              </h3>
              <ButtonM
                type="button"
                variant="ghost"
                onClick={() => setShowAddClass((visible) => !visible)}
              >
                {showAddClass ? "Ocultar formulario" : "Agregar clase"}
              </ButtonM>
            </div>
            {showAddClass ? (
              <form className="mt-4" onSubmit={handleAddClass}>
                <ClassFields
                  draft={newClass}
                  months={data.months}
                  showMonth
                  onChange={(patch) =>
                    setNewClass((previous) => ({ ...previous, ...patch }))
                  }
                />
                <div className="mt-4 flex justify-end">
                  <ButtonM
                    type="submit"
                    variant="ghost"
                    loading={addClass.isPending}
                    disabled={!newClass.monthId}
                  >
                    <LuPlus className="h-4 w-4" />
                    Guardar clase
                  </ButtonM>
                </div>
              </form>
            ) : null}
          </section>

          <section className="border-plum/15 rounded-3xl border bg-white/80 p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <h3 className="text-plum text-sm font-semibold">Editar clases</h3>
              <ButtonM
                type="button"
                variant="ghost"
                onClick={() => setShowEditClasses((visible) => !visible)}
              >
                {showEditClasses ? "Ocultar edición" : "Editar clases"}
              </ButtonM>
            </div>
            {showEditClasses ? (
              <StudentClassEditor
                classes={data.classes}
                drafts={classDrafts}
                isSaving={updateClass.isPending}
                onChange={handleClassDraftChange}
                onSave={handleSaveClass}
              />
            ) : null}
          </section>
        </div>

        <StudentClassSummary classes={data.classes} />
      </div>
    </section>
  );
}
