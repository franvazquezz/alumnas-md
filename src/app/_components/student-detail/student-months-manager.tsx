import type { FormEvent } from "react";
import { LuPlus } from "react-icons/lu";

import { ButtonM } from "~/app/_components/button";
import type { Student } from "~/types/utils";

type StudentMonthsManagerProps = {
  months: Student["months"];
  newMonth: string;
  showForm: boolean;
  isSaving: boolean;
  onMonthChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onToggle: () => void;
};

export function StudentMonthsManager({
  months,
  newMonth,
  showForm,
  isSaving,
  onMonthChange,
  onSubmit,
  onToggle,
}: StudentMonthsManagerProps) {
  return (
    <section className="border-plum/15 flex flex-col gap-4 rounded-3xl border bg-white/80 p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-plum/70 text-xs tracking-widest uppercase">
            Períodos
          </p>
          <h3 className="text-plum text-sm font-semibold">
            Meses que agrupan las clases
          </h3>
        </div>
        <ButtonM type="button" variant="ghost" onClick={onToggle}>
          {showForm ? "Ocultar formulario" : "Agregar mes"}
        </ButtonM>
      </div>

      {showForm ? (
        <form
          className="flex flex-col gap-3 md:flex-row md:items-end"
          onSubmit={onSubmit}
        >
          <label className="text-plum text-xs font-semibold">
            Nuevo período
            <input
              required
              type="month"
              value={newMonth}
              onChange={(event) => onMonthChange(event.target.value)}
              min="2000-01"
              max="2100-12"
              className="border-plum/20 text-ink ring-primary/20 mt-1 rounded-lg border bg-white px-3 py-2 text-sm transition outline-none focus:ring-2"
            />
          </label>
          <ButtonM type="submit" variant="ghost" loading={isSaving}>
            <LuPlus className="h-4 w-4" />
            Crear mes
          </ButtonM>
        </form>
      ) : null}

      {months.length === 0 ? (
        <p className="text-plum/60 text-sm">
          Aún no hay meses creados para este alumno.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {months.map((month) => (
            <span
              key={month.id}
              className="border-plum/20 text-plum rounded-full border bg-white/80 px-3 py-1 text-xs font-semibold"
            >
              {month.label}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
