import { LuSave } from "react-icons/lu";

import { ButtonM } from "~/app/_components/button";
import type { ClassFormState } from "~/types/students";
import type { Student } from "~/types/utils";
import { ClassFields, classToDraft } from "./class-fields";

type StudentClassEditorProps = {
  classes: Student["classes"];
  drafts: Record<number, ClassFormState>;
  isSaving: boolean;
  onChange: (classId: number, patch: Partial<ClassFormState>) => void;
  onSave: (classId: number) => void;
};

export function StudentClassEditor({
  classes,
  drafts,
  isSaving,
  onChange,
  onSave,
}: StudentClassEditorProps) {
  if (classes.length === 0) {
    return (
      <p className="text-plum/60 mt-4 text-sm">
        Este alumno aún no tiene clases cargadas.
      </p>
    );
  }

  return (
    <div className="mt-4 grid gap-4">
      {classes.map((classItem) => {
        const draft = drafts[classItem.id] ?? classToDraft(classItem);

        return (
          <article
            key={classItem.id}
            className="border-plum/15 bg-secondary/10 rounded-2xl border p-4 shadow-sm"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-plum text-lg font-semibold">
                  {classItem.className}
                </h4>
                <p className="text-plum/70 text-xs">
                  Período:{" "}
                  <span className="text-plum font-semibold">
                    {classItem.monthLabel}
                  </span>
                </p>
              </div>
              <span className="text-plum/60 text-xs">
                Creada el{" "}
                {new Date(classItem.createdAt).toLocaleDateString("es-AR")}
              </span>
            </div>

            <div className="mt-4">
              <ClassFields
                draft={draft}
                onChange={(patch) => onChange(classItem.id, patch)}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <ButtonM
                type="button"
                variant="ghost"
                loading={isSaving}
                onClick={() => onSave(classItem.id)}
              >
                <LuSave className="h-4 w-4" />
                Guardar clase
              </ButtonM>
            </div>
          </article>
        );
      })}
    </div>
  );
}
