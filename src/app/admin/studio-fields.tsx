type StudioForm = {
  name: string;
  slug: string;
  address: string;
  telephone: string;
  description: string;
};
const inputClass =
  "border-plum/20 text-ink ring-primary/20 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2";

export function StudioFields({
  form,
  onChange,
  requireSlug,
}: {
  form: StudioForm;
  onChange: (patch: Partial<StudioForm>) => void;
  requireSlug: boolean;
}) {
  return (
    <>
      <label className="text-plum grid gap-1 text-sm font-semibold">
        Nombre del taller
        <input
          required
          className={inputClass}
          value={form.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </label>
      <label className="text-plum grid gap-1 text-sm font-semibold">
        Identificador del taller
        <input
          required={requireSlug}
          className={inputClass}
          value={form.slug}
          onChange={(event) => onChange({ slug: event.target.value })}
          placeholder={
            requireSlug
              ? "identificador-del-taller"
              : "Se genera si queda vacío"
          }
        />
      </label>
      <label className="text-plum grid gap-1 text-sm font-semibold">
        Dirección
        <input
          className={inputClass}
          value={form.address}
          onChange={(event) => onChange({ address: event.target.value })}
        />
      </label>
      <label className="text-plum grid gap-1 text-sm font-semibold">
        Teléfono
        <input
          type="tel"
          className={inputClass}
          value={form.telephone}
          onChange={(event) => onChange({ telephone: event.target.value })}
        />
      </label>
      <label className="text-plum grid gap-1 text-sm font-semibold md:col-span-2">
        Descripción
        <textarea
          className={inputClass}
          value={form.description}
          onChange={(event) => onChange({ description: event.target.value })}
          rows={3}
        />
      </label>
    </>
  );
}
