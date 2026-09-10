import { StudentPortalShell } from "~/app/_components/student-portal-shell";
import {
  calendarDateFromDatabase,
  formatCalendarDate,
} from "~/lib/domain/calendar-date";
import { formatMoney } from "~/lib/domain/money";
import { getStudentPortalData } from "~/server/student-portal";
import { formatMonth } from "~/types/utils";

export default async function MyClassesPage() {
  const { student, studio } = await getStudentPortalData();
  const classes =
    student?.months.flatMap((month) =>
      month.classes.map((classItem) => ({
        ...classItem,
        monthLabel: formatMonth(month.year, month.month),
      })),
    ) ?? [];

  return (
    <StudentPortalShell
      studioName={studio?.name}
      title="Mis clases"
      description="Consultá tus clases, asistencia y cargos asociados."
    >
      {classes.length === 0 ? (
        <section className="border-plum/15 rounded-3xl border bg-white/80 p-8 text-center shadow-sm">
          <h2 className="text-plum text-xl font-black">
            Todavía no hay clases cargadas
          </h2>
          <p className="text-plum/70 mt-2">
            Cuando el taller registre una clase, vas a encontrarla acá.
          </p>
        </section>
      ) : (
        <div className="grid gap-4">
          {classes.map((classItem) => (
            <article
              key={classItem.id}
              className="border-plum/15 rounded-3xl border bg-white/80 p-6 shadow-sm"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="text-primary text-xs font-bold tracking-[0.15em] uppercase">
                    {classItem.monthLabel}
                  </p>
                  <h2 className="text-plum mt-1 text-xl font-black">
                    {classItem.className}
                  </h2>
                  <p className="text-plum/70 mt-1 text-sm">
                    {classItem.classDay
                      ? formatCalendarDate(
                          calendarDateFromDatabase(classItem.classDay) ?? "",
                        )
                      : "Fecha pendiente"}
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full px-3 py-1 text-sm font-bold ${
                    classItem.assistance
                      ? "bg-primary/10 text-primary"
                      : "bg-secondary/20 text-plum"
                  }`}
                >
                  {classItem.assistance ? "Asististe" : "Sin asistencia"}
                </span>
              </div>

              <dl className="text-plum/80 mt-5 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-bold uppercase">Clase</dt>
                  <dd className="mt-1 font-semibold">
                    {formatMoney(classItem.classPrice.toFixed(2))}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase">Pago</dt>
                  <dd className="mt-1 font-semibold">
                    {classItem.classPaymentStatus === "PAID"
                      ? "Pagado"
                      : "Pendiente"}
                  </dd>
                </div>
              </dl>

              {classItem.charges.length > 0 ? (
                <div className="border-plum/10 mt-5 border-t pt-4">
                  <h3 className="text-plum text-sm font-black">
                    Cargos adicionales
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {classItem.charges.map((charge) => (
                      <li
                        key={charge.id}
                        className="text-plum/75 flex items-center justify-between gap-4 text-sm"
                      >
                        <span>
                          {charge.type === "OVEN" ? "Horno" : "Material"} ·{" "}
                          {charge.description ?? "Sin detalle"}
                        </span>
                        <strong className="text-ink">
                          {formatMoney(charge.price.toFixed(2))}
                        </strong>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </StudentPortalShell>
  );
}
