import { type ClassFormState } from "~/types/students";
import { ButtonM } from "./button";
import { LuPlus } from "react-icons/lu";

type ClassFormProps = {
  draft: ClassFormState;
  months: { id: number; label: string }[];
  onChange: (updates: Partial<ClassFormState>) => void;
  onSubmit: () => void;
  submitting?: boolean;
  disableMonth?: boolean;
};

export const ClassForm = ({
  draft,
  months,
  onChange,
  onSubmit,
  submitting,
  disableMonth,
}: ClassFormProps) => (
  <>
    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
      <select
        value={draft.monthId ?? ""}
        onChange={(e) =>
          onChange({
            monthId: e.target.value === "" ? null : e.target.value,
          })
        }
        className="border-plum/20 text-ink ring-primary/20 rounded-lg border bg-white px-3 py-2 text-sm transition outline-none focus:ring-2"
        disabled={disableMonth ?? months.length === 0}
      >
        <option value="">
          {months.length === 0
            ? "Crea un mes para asignar"
            : "Selecciona un mes"}
        </option>
        {months.map((month) => (
          <option key={month.id} value={month.id}>
            {month.label}
          </option>
        ))}
      </select>
      <input
        value={draft.className}
        onChange={(e) => onChange({ className: e.target.value })}
        placeholder="Nombre"
        className="border-plum/20 text-ink ring-primary/20 rounded-lg border bg-white px-3 py-2 text-sm transition outline-none focus:ring-2"
      />
      <input
        type="number"
        value={draft.classPrice}
        onChange={(e) => onChange({ classPrice: e.target.value })}
        placeholder="Precio"
        className="border-plum/20 text-ink ring-primary/20 rounded-lg border bg-white px-3 py-2 text-sm transition outline-none focus:ring-2"
      />
      <input
        type="date"
        value={draft.classDay}
        onChange={(e) => onChange({ classDay: e.target.value })}
        className="border-plum/20 text-ink ring-primary/20 rounded-lg border bg-white px-3 py-2 text-sm transition outline-none focus:ring-2"
      />
      <label className="text-plum flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.classPaid}
          onChange={(e) => onChange({ classPaid: e.target.checked })}
          className="border-plum/30 text-primary focus:ring-primary h-4 w-4 rounded"
        />
        Pagado
      </label>
      <label className="text-plum flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.assistance}
          onChange={(e) => onChange({ assistance: e.target.checked })}
          className="border-plum/30 text-primary focus:ring-primary h-4 w-4 rounded"
        />
        Asistió
      </label>
      <input
        value={draft.ovenName}
        onChange={(e) => onChange({ ovenName: e.target.value })}
        placeholder="Horno (nombre)"
        className="border-plum/20 text-ink ring-primary/20 rounded-lg border bg-white px-3 py-2 text-sm transition outline-none focus:ring-2"
      />
      <input
        value={draft.ovenPrice}
        onChange={(e) => onChange({ ovenPrice: e.target.value })}
        placeholder="Horno (precio)"
        className="border-plum/20 text-ink ring-primary/20 rounded-lg border bg-white px-3 py-2 text-sm transition outline-none focus:ring-2"
      />
      <label className="text-plum flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.ovenPaid}
          onChange={(e) => onChange({ ovenPaid: e.target.checked })}
          className="border-plum/30 text-primary focus:ring-primary h-4 w-4 rounded"
        />
        Horno pagado
      </label>
      <input
        value={draft.materialName}
        onChange={(e) => onChange({ materialName: e.target.value })}
        placeholder="Material (nombre)"
        className="border-plum/20 text-ink ring-primary/20 rounded-lg border bg-white px-3 py-2 text-sm transition outline-none focus:ring-2"
      />
      <input
        value={draft.materialPrice}
        onChange={(e) => onChange({ materialPrice: e.target.value })}
        placeholder="Material (precio)"
        className="border-plum/20 text-ink ring-primary/20 rounded-lg border bg-white px-3 py-2 text-sm transition outline-none focus:ring-2"
      />
      <label className="text-plum flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.materialPaid}
          onChange={(e) => onChange({ materialPaid: e.target.checked })}
          className="border-plum/30 text-primary focus:ring-primary h-4 w-4 rounded"
        />
        Material pagado
      </label>
    </div>
    <div className="mt-3 flex justify-end">
      <ButtonM
        onClick={onSubmit}
        loading={submitting}
        type="button"
        disabled={!draft.monthId}
      >
        <LuPlus className="h-4 w-4" />
        Guardar clase
      </ButtonM>
    </div>
  </>
);
