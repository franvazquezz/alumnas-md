import { formatCalendarDate } from "~/lib/domain/calendar-date";
import { formatMoney } from "~/lib/domain/money";
import type { Student } from "~/types/utils";

const detailOrFallback = (value?: string | null) =>
  value?.trim() ? value : "Sin detalle";

export function StudentClassSummary({
  classes,
}: {
  classes: Student["classes"];
}) {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <p className="text-plum/70 text-xs tracking-widest uppercase">
          Resumen
        </p>
        <h3 className="text-plum text-sm font-semibold">
          Detalle de cada clase y sus cargos
        </h3>
      </div>

      {classes.length === 0 ? (
        <p className="border-plum/20 text-plum/70 rounded-2xl border border-dashed bg-white/70 p-6 text-sm">
          Este alumno aún no tiene clases cargadas.
        </p>
      ) : (
        <div className="grid gap-4">
          {classes.map((classItem) => (
            <article
              key={classItem.id}
              className="border-plum/15 rounded-3xl border bg-white/90 p-5 shadow-sm"
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
                  {classItem.classDay
                    ? formatCalendarDate(classItem.classDay)
                    : "Sin fecha"}
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-plum font-semibold">Clase</dt>
                  <dd className="text-plum/80">
                    {formatMoney(classItem.classPrice)} ·{" "}
                    {classItem.classPaymentStatus === "PAID"
                      ? "Pagada"
                      : "Pendiente"}
                  </dd>
                </div>
                <div>
                  <dt className="text-plum font-semibold">Asistencia</dt>
                  <dd className="text-plum/80">
                    {classItem.assistance ? "Sí" : "No"}
                  </dd>
                </div>
                <div>
                  <dt className="text-plum font-semibold">Horno heredado</dt>
                  <dd className="text-plum/80">
                    {detailOrFallback(classItem.ovenName)} ·{" "}
                    {formatMoney(classItem.ovenPrice)} ·{" "}
                    {classItem.ovenPaymentStatus === "PAID"
                      ? "Pagado"
                      : "Pendiente"}
                  </dd>
                </div>
                <div>
                  <dt className="text-plum font-semibold">Material heredado</dt>
                  <dd className="text-plum/80">
                    {detailOrFallback(classItem.materialName)} ·{" "}
                    {formatMoney(classItem.materialPrice)} ·{" "}
                    {classItem.materialPaymentStatus === "PAID"
                      ? "Pagado"
                      : "Pendiente"}
                  </dd>
                </div>
              </dl>

              {classItem.charges.length > 0 ? (
                <div className="border-plum/10 mt-4 border-t pt-4">
                  <p className="text-plum mb-2 text-xs font-bold uppercase">
                    Cargos adicionales
                  </p>
                  <ul className="space-y-2">
                    {classItem.charges.map((charge) => (
                      <li
                        key={charge.id}
                        className="bg-sand/70 flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm"
                      >
                        <span className="text-plum/80">
                          {charge.type === "OVEN" ? "Horno" : "Material"} ·{" "}
                          {charge.description ?? "Sin detalle"}
                        </span>
                        <span className="text-plum font-semibold">
                          {formatMoney(charge.price)} ·{" "}
                          {charge.paymentStatus === "PAID"
                            ? "Pagado"
                            : "Pendiente"}
                          {charge.needsReview ? " · Revisar asociación" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
