import { useId } from "react";
import type { StudentFormState, WeekdayOption } from "~/types/students";
import { WEEK_DAYS } from "~/types/utils";
import type { RouterOutputs } from "~/trpc/react";

export function StudentFields({
  form,
  onChange,
  shifts,
}: {
  form: StudentFormState;
  onChange: (form: StudentFormState) => void;
  shifts: RouterOutputs["students"]["formOptions"];
}) {
  const fieldId = useId();
  return (
    <>
      <label className="text-plum grid min-w-0 gap-1 text-sm font-semibold">
        Nombre completo
        <input
          required
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="Nombre completo"
          className="border-plum/20 text-ink ring-primary/20 w-full min-w-0 rounded-xl border bg-white px-4 py-2 text-sm transition outline-none focus:ring-2"
        />
      </label>
      <label className="text-plum grid min-w-0 gap-1 text-sm font-semibold">
        Cumpleaños
        <input
          type="date"
          value={form.birthday}
          onChange={(e) => onChange({ ...form, birthday: e.target.value })}
          className="border-plum/20 text-ink ring-primary/20 w-full min-w-0 rounded-xl border bg-white px-4 py-2 text-sm transition outline-none focus:ring-2"
        />
      </label>
      <label className="text-plum grid min-w-0 gap-1 text-sm font-semibold">
        Teléfono
        <input
          type="tel"
          value={form.telephone}
          onChange={(e) => onChange({ ...form, telephone: e.target.value })}
          placeholder="Teléfono"
          className="border-plum/20 text-ink ring-primary/20 w-full min-w-0 rounded-xl border bg-white px-4 py-2 text-sm transition outline-none focus:ring-2"
        />
      </label>
      <div className="text-plum grid min-w-0 gap-1 text-sm font-semibold">
        <label htmlFor={`${fieldId}-1`}>Día preferido</label>
        <select
          id={`${fieldId}-1`}
          value={form.weekday ?? ""}
          onChange={(e) =>
            onChange({
              ...form,
              weekday: (e.target.value || null) as WeekdayOption | null,
            })
          }
          className="border-plum/20 text-ink ring-primary/20 w-full min-w-0 rounded-xl border bg-white px-4 py-2 text-sm transition outline-none focus:ring-2"
        >
          <option value="">Sin día asignado</option>
          {WEEK_DAYS.map((day) => (
            <option key={day.value} value={day.value}>
              {day.label}
            </option>
          ))}
        </select>
      </div>
      <div className="text-plum grid min-w-0 gap-1 text-sm font-semibold">
        <label htmlFor={`${fieldId}-2`}>Horario</label>
        <select
          id={`${fieldId}-2`}
          value={form.shiftId ?? ""}
          onChange={(e) =>
            onChange({
              ...form,
              shiftId: e.target.value ? Number(e.target.value) : null,
            })
          }
          className="border-plum/20 text-ink ring-primary/20 w-full min-w-0 rounded-xl border bg-white px-4 py-2 text-sm transition outline-none focus:ring-2"
        >
          <option value="">Seleccionar horario</option>
          {shifts.map((shift) => (
            <option
              key={shift.id}
              value={shift.id}
              disabled={!shift.isActive && shift.id !== form.shiftId}
            >
              {shift.startTime}
              {shift.label ? ` · ${shift.label}` : ""}
              {!shift.isActive ? " · inactivo" : ""}
            </option>
          ))}
        </select>
      </div>
      <label className="text-plum flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => onChange({ ...form, isActive: e.target.checked })}
          className="border-plum/30 text-primary focus:ring-primary h-4 w-4 rounded"
        />
        Alumno activo
      </label>
    </>
  );
}
