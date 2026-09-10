import type { ClassFormState } from "~/types/students";
import type { Student } from "~/types/utils";

type StudentClass = Student["classes"][number];
type StudentMonth = Student["months"][number];

const fieldClass =
  "border-plum/20 text-ink ring-primary/20 mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm transition outline-none focus:ring-2";

export const emptyClassDraft = (monthId: number | null): ClassFormState => ({
  className: "",
  classPrice: "",
  classDay: "",
  classPaymentStatus: "PENDING",
  monthId,
  assistance: false,
  ovenName: "",
  ovenPrice: "",
  ovenPaymentStatus: "PENDING",
  materialName: "",
  materialPrice: "",
  materialPaymentStatus: "PENDING",
});

export const classToDraft = (classItem: StudentClass): ClassFormState => ({
  className: classItem.className ?? "",
  classPrice: classItem.classPrice ? String(classItem.classPrice) : "",
  classDay: classItem.classDay ?? "",
  classPaymentStatus: classItem.classPaymentStatus,
  monthId: classItem.monthId ?? null,
  assistance: Boolean(classItem.assistance),
  ovenName: classItem.ovenName ?? "",
  ovenPrice: classItem.ovenPrice ?? "",
  ovenPaymentStatus: classItem.ovenPaymentStatus,
  materialName: classItem.materialName ?? "",
  materialPrice: classItem.materialPrice ?? "",
  materialPaymentStatus: classItem.materialPaymentStatus,
});

type ClassFieldsProps = {
  draft: ClassFormState;
  onChange: (patch: Partial<ClassFormState>) => void;
  months?: StudentMonth[];
  showMonth?: boolean;
};

export function ClassFields({
  draft,
  onChange,
  months = [],
  showMonth = false,
}: ClassFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      {showMonth ? (
        <label className="text-plum text-xs font-semibold">
          Período
          <select
            value={draft.monthId ?? ""}
            onChange={(event) =>
              onChange({
                monthId: event.target.value ? Number(event.target.value) : null,
              })
            }
            className={fieldClass}
            disabled={months.length === 0}
          >
            <option value="">
              {months.length === 0
                ? "Creá un mes para asignar"
                : "Seleccioná un mes"}
            </option>
            {months.map((month) => (
              <option key={month.id} value={month.id}>
                {month.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="text-plum text-xs font-semibold">
        Nombre de la clase
        <input
          required
          value={draft.className}
          onChange={(event) => onChange({ className: event.target.value })}
          className={fieldClass}
        />
      </label>
      <label className="text-plum text-xs font-semibold">
        Precio de la clase
        <input
          required
          type="number"
          min="0"
          step="0.01"
          value={draft.classPrice}
          onChange={(event) => onChange({ classPrice: event.target.value })}
          className={fieldClass}
        />
      </label>
      <label className="text-plum text-xs font-semibold">
        Fecha
        <input
          type="date"
          value={draft.classDay}
          onChange={(event) => onChange({ classDay: event.target.value })}
          className={fieldClass}
        />
      </label>
      <div className="flex flex-wrap items-end gap-4 pb-2">
        <label className="text-plum flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.classPaymentStatus === "PAID"}
            onChange={(event) =>
              onChange({
                classPaymentStatus: event.target.checked ? "PAID" : "PENDING",
              })
            }
            className="border-plum/30 text-primary focus:ring-primary h-4 w-4 rounded"
          />
          Clase pagada
        </label>
        <label className="text-plum flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.assistance}
            onChange={(event) => onChange({ assistance: event.target.checked })}
            className="border-plum/30 text-primary focus:ring-primary h-4 w-4 rounded"
          />
          Asistió
        </label>
      </div>

      <label className="text-plum text-xs font-semibold">
        Detalle de horno
        <input
          value={draft.ovenName}
          onChange={(event) => onChange({ ovenName: event.target.value })}
          className={fieldClass}
        />
      </label>
      <label className="text-plum text-xs font-semibold">
        Precio de horno
        <input
          type="number"
          min="0"
          step="0.01"
          value={draft.ovenPrice}
          onChange={(event) => onChange({ ovenPrice: event.target.value })}
          className={fieldClass}
        />
      </label>
      <label className="text-plum flex items-end gap-2 pb-2 text-sm">
        <input
          type="checkbox"
          checked={draft.ovenPaymentStatus === "PAID"}
          onChange={(event) =>
            onChange({
              ovenPaymentStatus: event.target.checked ? "PAID" : "PENDING",
            })
          }
          className="border-plum/30 text-primary focus:ring-primary h-4 w-4 rounded"
        />
        Horno pagado
      </label>

      <label className="text-plum text-xs font-semibold">
        Detalle de material
        <input
          value={draft.materialName}
          onChange={(event) => onChange({ materialName: event.target.value })}
          className={fieldClass}
        />
      </label>
      <label className="text-plum text-xs font-semibold">
        Precio de material
        <input
          type="number"
          min="0"
          step="0.01"
          value={draft.materialPrice}
          onChange={(event) => onChange({ materialPrice: event.target.value })}
          className={fieldClass}
        />
      </label>
      <label className="text-plum flex items-end gap-2 pb-2 text-sm">
        <input
          type="checkbox"
          checked={draft.materialPaymentStatus === "PAID"}
          onChange={(event) =>
            onChange({
              materialPaymentStatus: event.target.checked ? "PAID" : "PENDING",
            })
          }
          className="border-plum/30 text-primary focus:ring-primary h-4 w-4 rounded"
        />
        Material pagado
      </label>
    </div>
  );
}
